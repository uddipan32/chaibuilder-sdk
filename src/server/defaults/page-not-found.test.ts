import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetActiveChaiBuilderConfigForTests, resolveConfigPageNotFound } from "~/server/defaults/config-registry";

const args = { slug: "/missing", appId: "app-1", lang: "en", draft: false };

describe("onPageNotFound", () => {
  beforeEach(() => {
    resetActiveChaiBuilderConfigForTests();
  });

  it("returns null when no handler is configured", async () => {
    expect(await resolveConfigPageNotFound(args)).toBeNull();
  });

  it("passes the unresolved path and request context to the handler", async () => {
    const onPageNotFound = vi.fn(async () => undefined);
    resetActiveChaiBuilderConfigForTests({ onPageNotFound });

    await resolveConfigPageNotFound(args);

    expect(onPageNotFound).toHaveBeenCalledWith({ slug: "/missing", appId: "app-1", lang: "en", draft: false });
  });

  it("resolves a redirect returned by the handler, defaulting to temporary", async () => {
    resetActiveChaiBuilderConfigForTests({ onPageNotFound: async () => ({ redirect: "/search" }) });

    expect(await resolveConfigPageNotFound(args)).toEqual({ redirect: "/search", permanent: false });
  });

  it("honours an explicitly permanent redirect", async () => {
    resetActiveChaiBuilderConfigForTests({
      onPageNotFound: async () => ({ redirect: "/new-home", permanent: true }),
    });

    expect(await resolveConfigPageNotFound(args)).toEqual({ redirect: "/new-home", permanent: true });
  });

  it("keeps the 404 when the handler declines", async () => {
    resetActiveChaiBuilderConfigForTests({ onPageNotFound: async () => ({ notFound: true }) });

    expect(await resolveConfigPageNotFound(args)).toBeNull();
  });

  it("keeps the 404 when the handler returns nothing", async () => {
    resetActiveChaiBuilderConfigForTests({ onPageNotFound: async () => undefined });

    expect(await resolveConfigPageNotFound(args)).toBeNull();
  });

  it("refuses a redirect back to the same path so visitors cannot loop", async () => {
    resetActiveChaiBuilderConfigForTests({ onPageNotFound: async () => ({ redirect: "/missing" }) });

    expect(await resolveConfigPageNotFound(args)).toBeNull();
  });

  it("ignores an empty redirect target", async () => {
    resetActiveChaiBuilderConfigForTests({ onPageNotFound: async () => ({ redirect: "   " }) });

    expect(await resolveConfigPageNotFound(args)).toBeNull();
  });

  it.each(["//evil.com", "/\\evil.com", "javascript:alert(1)", "mailto:a@b.com", "somewhere"])(
    "refuses the unusable redirect target %j",
    async (redirect) => {
      resetActiveChaiBuilderConfigForTests({ onPageNotFound: async () => ({ redirect }) });

      expect(await resolveConfigPageNotFound(args)).toBeNull();
    },
  );

  it("allows a deliberate external redirect, e.g. a legacy site on another domain", async () => {
    resetActiveChaiBuilderConfigForTests({ onPageNotFound: async () => ({ redirect: "https://old.example.com/a" }) });

    expect(await resolveConfigPageNotFound(args)).toEqual({ redirect: "https://old.example.com/a", permanent: false });
  });

  it("allows an internal path carrying a query string", async () => {
    resetActiveChaiBuilderConfigForTests({ onPageNotFound: async () => ({ redirect: "/search?q=missing" }) });

    expect(await resolveConfigPageNotFound(args)).toEqual({ redirect: "/search?q=missing", permanent: false });
  });

  it("coerces a non-boolean permanent flag", async () => {
    resetActiveChaiBuilderConfigForTests({
      onPageNotFound: async () => ({ redirect: "/x", permanent: "yes" as unknown as boolean }),
    });

    expect(await resolveConfigPageNotFound(args)).toEqual({ redirect: "/x", permanent: true });
  });

  it("ignores a non-string redirect target", async () => {
    resetActiveChaiBuilderConfigForTests({
      onPageNotFound: async () => ({ redirect: { to: "/x" } as unknown as string }),
    });

    expect(await resolveConfigPageNotFound(args)).toBeNull();
  });

  it("degrades to a 404 when the handler throws", async () => {
    resetActiveChaiBuilderConfigForTests({
      onPageNotFound: async () => {
        throw new Error("app blew up");
      },
    });

    expect(await resolveConfigPageNotFound(args)).toBeNull();
  });
});
