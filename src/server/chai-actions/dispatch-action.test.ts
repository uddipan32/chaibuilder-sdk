import { beforeEach, describe, expect, it } from "vitest";
import { buildChaiBuilderConfig } from "~/server/build-config";
import { stubChaiDbConfig } from "~/tests/setup/stub-chai-db";
import { runInContext } from "~/server/chai-builder/state";
import { resetActiveChaiBuilderConfigForTests } from "~/server/defaults/config-registry";
import { registerChaiPermissions, resetChaiPermissionsForTests } from "~/server/plugin-api/permission-registry";
import { ChaiBaseAction } from "./base-action";
import { dispatchChaiAction, tryChaiAction } from "./dispatch-action";

/** A member of the app, as the context resolver would report them. */
const member = (permissions: string[], role = "editor") => ({
  appId: "test-app",
  userId: "user-1",
  role,
  permissions,
});

/** Registers a gated action so `enforcePermission` has something to enforce. */
function registerGatedAction(name: string, requiredPermission: string) {
  class GatedAction extends ChaiBaseAction<unknown, { ok: true }> {
    public requiredPermission = requiredPermission;
    async execute() {
      return { ok: true } as const;
    }
  }
  const action = new GatedAction();
  buildChaiBuilderConfig({ db: stubChaiDbConfig(), actions: { [name]: action } });
  return action;
}

describe("dispatchChaiAction", () => {
  beforeEach(() => {
    resetActiveChaiBuilderConfigForTests();
    buildChaiBuilderConfig({ db: stubChaiDbConfig() });
  });

  it("throws when userId is missing for authenticated actions", async () => {
    await expect(
      runInContext({ appId: "test-app" }, () => dispatchChaiAction("GET_DRAFT_PAGE", {})),
    ).rejects.toThrow(/initWithUser/);
  });

  it("dispatches authenticated actions for a member", async () => {
    const result = await runInContext(member(["*"], "admin"), () => dispatchChaiAction("CHECK_USER_ACCESS", {}));

    expect(result).toMatchObject({ access: true, role: "admin" });
  });

  it("throws ACTION_NOT_FOUND for unknown actions", async () => {
    await expect(
      runInContext(member(["*"]), () => dispatchChaiAction("UNKNOWN_ACTION", {})),
    ).rejects.toMatchObject({ code: "ACTION_NOT_FOUND" });
  });

  // The resolver is the only authority; no permissions means it did not recognise this user
  // as a member, and there is nobody left to ask.
  it("rejects an authenticated user the resolver granted no permissions", async () => {
    await expect(
      runInContext({ appId: "test-app", userId: "user-1" }, () => dispatchChaiAction("CREATE_PAGE", {})),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("reports the resolver's decision through CHECK_USER_ACCESS", async () => {
    const result = await runInContext(member(["pages:read"]), () => dispatchChaiAction("CHECK_USER_ACCESS", {}));

    expect(result).toEqual({ access: true, role: "editor", permissions: ["pages:read"] });
  });

  it("defaults the role label when the resolver supplies permissions without one", async () => {
    const result = (await runInContext({ appId: "test-app", userId: "user-1", permissions: [] }, () =>
      dispatchChaiAction("CHECK_USER_ACCESS", {}),
    )) as { role: string };

    expect(result.role).toBe("custom");
  });

  it("runs a gated action the user is granted", async () => {
    registerGatedAction("GATED_READ", "pages:read");

    const result = await runInContext(member(["pages:read"]), () => dispatchChaiAction("GATED_READ", {}));

    expect(result).toEqual({ ok: true });
  });

  it("denies a gated action the user is not granted", async () => {
    registerGatedAction("GATED_UPDATE", "pages:update");

    await expect(
      runInContext(member(["pages:read"]), () => dispatchChaiAction("GATED_UPDATE", {})),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  // Overriding CHECK_USER_ACCESS changes what the client is told, never what is enforced.
  it("keeps enforcing the resolver's decision when CHECK_USER_ACCESS is overridden", async () => {
    class LyingCheckUserAccess extends ChaiBaseAction<unknown, { access: boolean }> {
      async execute() {
        return { access: true, role: "admin", permissions: ["*"] };
      }
    }
    buildChaiBuilderConfig({
      db: stubChaiDbConfig(),
      actions: { CHECK_USER_ACCESS: new LyingCheckUserAccess() },
    });
    registerGatedAction("GATED_UPDATE", "pages:update");

    await expect(
      runInContext(member(["pages:read"]), () => dispatchChaiAction("GATED_UPDATE", {})),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("dispatchChaiAction — delegated permissions", () => {
  beforeEach(() => {
    resetActiveChaiBuilderConfigForTests();
    buildChaiBuilderConfig({ db: stubChaiDbConfig() });
  });

  it("clamps permissions to the delegated ceiling", async () => {
    registerGatedAction("GATED_UPDATE", "pages:update");

    await expect(
      runInContext({ ...member(["*"], "admin"), delegatedPermissions: ["pages:read"] }, () =>
        dispatchChaiAction("GATED_UPDATE", {}),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows what the delegated ceiling grants", async () => {
    registerGatedAction("GATED_READ", "pages:read");

    const result = await runInContext({ ...member(["*"], "admin"), delegatedPermissions: ["pages:read"] }, () =>
      dispatchChaiAction("GATED_READ", {}),
    );

    expect(result).toEqual({ ok: true });
  });

  it("honours the deprecated delegatedScopes name", async () => {
    registerGatedAction("GATED_UPDATE", "pages:update");

    await expect(
      runInContext({ ...member(["*"], "admin"), delegatedScopes: ["pages:read"] }, () =>
        dispatchChaiAction("GATED_UPDATE", {}),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps host-defined permission keys intersectable", async () => {
    registerGatedAction("GATED_CUSTOM", "custom:thing");

    const result = await runInContext(
      { ...member(["*", "custom:thing"], "admin"), delegatedPermissions: ["custom:thing"] },
      () => dispatchChaiAction("GATED_CUSTOM", {}),
    );

    expect(result).toEqual({ ok: true });
  });

  // A delegated entity wildcard only expands against the runtime catalog, so
  // plugin-registered permission keys must be part of it.
  it("expands a delegated wildcard over plugin-registered permissions", async () => {
    class GatedAction extends ChaiBaseAction<unknown, { ok: true }> {
      public requiredPermission = "widgets:read";
      async execute() {
        return { ok: true } as const;
      }
    }
    buildChaiBuilderConfig({
      db: stubChaiDbConfig(),
      actions: { GATED_WIDGET: new GatedAction() },
    });
    registerChaiPermissions("test:widgets", ["widgets:read", "widgets:update"]);
    try {
      const result = await runInContext({ ...member(["*"], "admin"), delegatedPermissions: ["widgets:*"] }, () =>
        dispatchChaiAction("GATED_WIDGET", {}),
      );

      expect(result).toEqual({ ok: true });
    } finally {
      resetChaiPermissionsForTests();
    }
  });

  it("denies everything when the delegated ceiling is empty", async () => {
    registerGatedAction("GATED_READ", "pages:read");

    await expect(
      runInContext({ ...member(["*"], "admin"), delegatedPermissions: [] }, () =>
        dispatchChaiAction("GATED_READ", {}),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports the clamped permission set to the builder UI", async () => {
    const result = (await runInContext({ ...member(["*"], "admin"), delegatedPermissions: ["pages:read"] }, () =>
      dispatchChaiAction("CHECK_USER_ACCESS", {}),
    )) as { permissions: string[] };

    expect(result.permissions).toEqual(["pages:read"]);
  });
});

describe("tryChaiAction", () => {
  beforeEach(() => {
    resetActiveChaiBuilderConfigForTests();
    buildChaiBuilderConfig({ db: stubChaiDbConfig() });
  });

  it("returns ok:false for missing user context", async () => {
    const result = await runInContext({ appId: "test-app" }, () => tryChaiAction("GET_DRAFT_PAGE", {}));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL_ERROR");
    }
  });

  it("returns ok:true for successful dispatch", async () => {
    const result = await runInContext(member(["*"], "admin"), () => tryChaiAction("CHECK_USER_ACCESS", {}));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({ access: true, role: "admin" });
    }
  });
});
