import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("~/server/chai-actions/db", () => ({
  db: {
    query: {
      appDomains: {
        findFirst,
      },
    },
  },
  safeQuery: async <T>(fn: () => Promise<T>) => ({ data: await fn(), error: null }),
  schema: {
    appDomains: {
      domain: "domain",
      subdomain: "subdomain",
      app: "app",
    },
  },
}));

vi.mock("./cache-utils", () => ({
  withRequestCache: <T extends (...args: never[]) => Promise<string>>(fn: T) => fn,
  withPersistentCache: <T extends (...args: never[]) => Promise<string>>(fn: T) => fn,
}));

describe("resolveAppIdByHostname", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("returns app id for a matching hostname", async () => {
    findFirst.mockResolvedValue({ app: "app-123" });
    const { resolveAppIdByHostname } = await import("./resolve-app-id-by-hostname");

    await expect(resolveAppIdByHostname("www.example.com")).resolves.toBe("app-123");
    expect(findFirst).toHaveBeenCalled();
  });

  it("throws when no site matches the hostname", async () => {
    findFirst.mockResolvedValue(undefined);
    const { resolveAppIdByHostname } = await import("./resolve-app-id-by-hostname");

    await expect(resolveAppIdByHostname("unknown.example.com")).rejects.toThrow(
      "No site found for hostname: unknown.example.com",
    );
  });
});
