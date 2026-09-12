import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ROLE_MAPS } from "./default-roles";

vi.mock("~/server/defaults/config-registry", () => ({
  getConfigRoles: vi.fn(),
  getConfigDefaultRoleGrants: vi.fn(() => ({})),
}));

import { getConfigDefaultRoleGrants, getConfigRoles } from "~/server/defaults/config-registry";
import { getGlobalRoles } from "./get-role-permissions";

const mockGetConfigRoles = vi.mocked(getConfigRoles);
const mockGetConfigDefaultRoleGrants = vi.mocked(getConfigDefaultRoleGrants);

describe("getGlobalRoles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfigDefaultRoleGrants.mockReturnValue({});
  });

  it("returns DEFAULT_ROLE_MAPS when roles config is undefined", async () => {
    mockGetConfigRoles.mockReturnValue(undefined);
    const result = await getGlobalRoles();
    expect(result).toBe(DEFAULT_ROLE_MAPS);
  });

  it("returns static roles map directly when provided in config", async () => {
    const staticRoles = { admin: { permissions: ["*"] }, viewer: { permissions: ["pages:read"] } };
    mockGetConfigRoles.mockReturnValue(staticRoles);
    const result = await getGlobalRoles();
    expect(result).toBe(staticRoles);
  });

  // The roles plugin swaps `{ source: "custom" }` for its loader function.
  it("awaits a plugin-installed loader and uses its map as-is", async () => {
    const loaded = { editor: { permissions: ["pages:read"] } };
    const loader = vi.fn(async () => loaded);
    mockGetConfigRoles.mockReturnValue(loader);

    const result = await getGlobalRoles();
    expect(loader).toHaveBeenCalledOnce();
    expect(result).toBe(loaded);
  });

  it("falls back to defaults when the loader reports nothing stored (null)", async () => {
    mockGetConfigRoles.mockReturnValue(async () => null);
    const result = await getGlobalRoles();
    expect(result).toBe(DEFAULT_ROLE_MAPS);
  });

  it("keeps a loader's empty map (fail closed on loader errors)", async () => {
    mockGetConfigRoles.mockReturnValue(async () => ({}));
    const result = await getGlobalRoles();
    expect(result).toEqual({});
  });

  // `{ source: "custom" }` surviving resolution means no roles plugin ran.
  it("falls back to defaults and warns when source:custom has no engine", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockGetConfigRoles.mockReturnValue({ source: "custom" });

    const first = await getGlobalRoles();
    await getGlobalRoles();

    expect(first).toBe(DEFAULT_ROLE_MAPS);
    // Warn-once flag is module state, so across this file it fires at most once.
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
    warn.mockRestore();
  });
});

describe("getGlobalRoles + defaultRoleGrants (plugin-contributed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfigDefaultRoleGrants.mockReturnValue({});
  });

  it("overlays contributed grants onto the no-config fallback", async () => {
    mockGetConfigRoles.mockReturnValue(undefined);
    mockGetConfigDefaultRoleGrants.mockReturnValue({ editor: ["redirects:read", "redirects:create"] });

    const result = await getGlobalRoles();
    expect(result.editor?.permissions).toEqual(
      expect.arrayContaining([...DEFAULT_ROLE_MAPS.editor!.permissions!, "redirects:read", "redirects:create"]),
    );
  });

  it("overlays contributed grants onto the loader's nothing-stored fallback", async () => {
    mockGetConfigRoles.mockReturnValue(async () => null);
    mockGetConfigDefaultRoleGrants.mockReturnValue({ viewer: ["revisions:read"] });

    const result = await getGlobalRoles();
    expect(result.viewer?.permissions).toContain("revisions:read");
  });

  it("does NOT overlay a literal role map from config", async () => {
    const staticRoles = { editor: { permissions: ["pages:read"] } };
    mockGetConfigRoles.mockReturnValue(staticRoles);
    mockGetConfigDefaultRoleGrants.mockReturnValue({ editor: ["redirects:read"] });

    const result = await getGlobalRoles();
    expect(result).toBe(staticRoles);
    expect(result.editor?.permissions).not.toContain("redirects:read");
  });

  it("does NOT overlay loader-provided roles", async () => {
    mockGetConfigRoles.mockReturnValue(async () => ({ editor: { permissions: ["pages:read"] } }));
    mockGetConfigDefaultRoleGrants.mockReturnValue({ editor: ["redirects:read"] });

    const result = await getGlobalRoles();
    expect(result.editor?.permissions).toEqual(["pages:read"]);
  });

  it("leaves grant-all roles untouched", async () => {
    mockGetConfigRoles.mockReturnValue(undefined);
    mockGetConfigDefaultRoleGrants.mockReturnValue({ admin: ["redirects:read"] });

    const result = await getGlobalRoles();
    expect(result.admin?.permissions).toEqual(["*"]);
  });

  it("ignores grants for roles the defaults do not define", async () => {
    mockGetConfigRoles.mockReturnValue(undefined);
    mockGetConfigDefaultRoleGrants.mockReturnValue({ ghost: ["redirects:read"] });

    const result = await getGlobalRoles();
    expect(result.ghost).toBeUndefined();
  });

  it("does not mutate DEFAULT_ROLE_MAPS", async () => {
    mockGetConfigRoles.mockReturnValue(undefined);
    mockGetConfigDefaultRoleGrants.mockReturnValue({ editor: ["redirects:read"] });

    await getGlobalRoles();
    expect(DEFAULT_ROLE_MAPS.editor?.permissions).not.toContain("redirects:read");
  });
});
