import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/chai-actions/db", () => ({
  db: { select: vi.fn() },
  safeQuery: vi.fn(),
  schema: { appUsers: { app: "app", user: "user", status: "status", role: "role", permissions: "permissions" } },
}));

// Not mocking `getGlobalRoles` — stubbing its config input instead, so the real role
// resolution runs and the built-in DEFAULT_ROLE_MAPS fallback is exercised end to end.
vi.mock("~/server/defaults/config-registry", () => ({
  getConfigRoles: vi.fn(() => undefined),
  getConfigDefaultRoleGrants: vi.fn(() => ({})),
}));

import { safeQuery } from "~/server/chai-actions/db";
import { getConfigDefaultRoleGrants } from "~/server/defaults/config-registry";
import { registerChaiPermissions, resetChaiPermissionsForTests } from "~/server/plugin-api/permission-registry";
import { isChaiGlobalSuperAdmin, resolveChaiAppUserAccess } from "./app-user-access";

const mockSafeQuery = vi.mocked(safeQuery);
const mockGrants = vi.mocked(getConfigDefaultRoleGrants);

/** Registers plugin permission keys in the real registry (reset per test). */
const registerExtras = (keys: string[]) => registerChaiPermissions("test:extras", keys);

/** `safeQuery` resolves to the rows the membership query would have returned. */
const rows = (data: unknown[]) => mockSafeQuery.mockResolvedValue({ data, error: null } as never);

describe("resolveChaiAppUserAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChaiPermissionsForTests();
    mockGrants.mockReturnValue({});
  });

  // The membership row carries a role, not a permission list — `permissions` is null unless
  // someone has overridden it per user. The role's own grants are what should apply.
  it("resolves a null permissions column from the role's built-in grants", async () => {
    rows([{ role: "viewer", permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access).toEqual({
      role: "viewer",
      permissions: ["app:read", "pages:read", "partials:read", "assets:read", "library:read"],
    });
  });

  // Plugin-contributed keys: extras widen the catalog, grants land on the fallback roles.
  it("includes plugin-contributed grants and expands them against the widened catalog", async () => {
    registerExtras(["redirects:read", "revisions:read", "revisions:restore", "revisions:delete"]);
    mockGrants.mockReturnValue({ viewer: ["redirects:read", "revisions:read"], editor: ["revisions:*"] });
    rows([{ role: "viewer", permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access?.permissions).toContain("redirects:read");
    expect(access?.permissions).toContain("revisions:read");
  });

  it("expands a contributed entity wildcard grant against the widened catalog", async () => {
    registerExtras(["revisions:read", "revisions:restore", "revisions:delete"]);
    mockGrants.mockReturnValue({ editor: ["revisions:*"] });
    rows([{ role: "editor", permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access?.permissions).toEqual(
      expect.arrayContaining(["revisions:read", "revisions:restore", "revisions:delete"]),
    );
  });

  it("wildcard roles cover plugin-contributed keys once extras widen the catalog", async () => {
    registerExtras(["redirects:read"]);
    rows([{ role: "admin", permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access?.permissions).toContain("redirects:read");
  });

  it("excludes plugin keys when no extras are registered", async () => {
    rows([{ role: "admin", permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access?.permissions).not.toContain("redirects:read");
  });

  it("expands an admin's wildcard against the whole catalog", async () => {
    rows([{ role: "admin", permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access?.role).toBe("admin");
    expect(access?.permissions).toContain("pages:create");
    expect(access?.permissions).toContain("users:update_role");
    expect(access?.permissions.length).toBeGreaterThan(10);
  });

  it("returns null when the user has no active membership", async () => {
    rows([]);

    await expect(resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" })).resolves.toBeNull();
  });

  it("applies per-user grants on top of the role", async () => {
    rows([{ role: "viewer", permissions: { "pages:update": true } }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access?.permissions).toContain("pages:update");
    expect(access?.permissions).toContain("pages:read");
  });

  it("lets a per-user revoke override the role's grant", async () => {
    rows([{ role: "viewer", permissions: { "pages:read": false } }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access?.permissions).not.toContain("pages:read");
    expect(access?.permissions).toContain("assets:read");
  });

  it("falls back to the 'user' role when the row has none", async () => {
    rows([{ role: null, permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access).toEqual({ role: "user", permissions: ["app:read", "pages:read"] });
  });

  it("grants nothing for a role no map defines", async () => {
    rows([{ role: "not-a-role", permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" });

    expect(access).toEqual({ role: "not-a-role", permissions: [] });
  });

  it("surfaces a database failure rather than reporting no access", async () => {
    mockSafeQuery.mockResolvedValue({ data: null, error: new Error("connection refused") } as never);

    await expect(resolveChaiAppUserAccess({ appId: "app-1", userId: "user-1" })).rejects.toThrow(
      /failed to read app_users/,
    );
  });

  // A global row (app IS NULL) is matched by the same query, so a superadmin needs no
  // special case at the permission layer — the role's own grants do the work.
  it("expands a global superadmin row to every permission, including plugin keys", async () => {
    registerExtras(["redirects:manage"]);
    rows([{ role: "superadmin", permissions: null }]);

    const access = await resolveChaiAppUserAccess({ appId: "any-app", userId: "user-1" });

    expect(access?.role).toBe("superadmin");
    expect(access?.permissions).toContain("redirects:manage");
    expect(access?.permissions).toEqual(expect.arrayContaining(["app:read", "pages:publish", "theme:edit"]));
  });
});

describe("isChaiGlobalSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChaiPermissionsForTests();
    mockGrants.mockReturnValue({});
  });

  it("is true when an active global row exists", async () => {
    rows([{ id: "row-1" }]);

    await expect(isChaiGlobalSuperAdmin("user-1")).resolves.toBe(true);
  });

  it("is false when no global row matches", async () => {
    rows([]);

    await expect(isChaiGlobalSuperAdmin("user-1")).resolves.toBe(false);
  });

  it("is false for an empty user id without querying", async () => {
    await expect(isChaiGlobalSuperAdmin("")).resolves.toBe(false);
    expect(mockSafeQuery).not.toHaveBeenCalled();
  });

  // Listing code decides visibility from this answer, so a failed read must not be
  // reported as "not a superadmin" — that would silently hide every site.
  it("throws on a database failure rather than reporting false", async () => {
    mockSafeQuery.mockResolvedValue({ data: null, error: new Error("connection refused") } as never);

    await expect(isChaiGlobalSuperAdmin("user-1")).rejects.toThrow(/failed to read app_users/);
  });
});
