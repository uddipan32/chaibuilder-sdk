import { describe, expect, it, vi } from "vitest";
import { createInvalidateTagAdapter } from "~/nextjs/invalidate-tag";

describe("createInvalidateTagAdapter", () => {
  it("keeps the v15 single-argument revalidateTag signature", async () => {
    const revalidateTagSpy = vi.fn();
    const adapter = createInvalidateTagAdapter((tag: string) => {
      revalidateTagSpy(tag);
    });

    expect(adapter.length).toBe(1);
    await adapter("tag-1");
    expect(revalidateTagSpy).toHaveBeenCalledWith("tag-1");
  });

  it("keeps the v16 two-argument revalidateTag signature", async () => {
    const revalidateTagSpy = vi.fn();
    const adapter = createInvalidateTagAdapter((tag: string, profile: unknown) => {
      revalidateTagSpy(tag, profile);
    });

    expect(adapter.length).toBe(2);
    await adapter("tag-2", "max");
    expect(revalidateTagSpy).toHaveBeenCalledWith("tag-2", "max");
  });

  it("forwards async revalidateTag results", async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((r) => {
      resolve = r;
    });
    const revalidateTagSpy = vi.fn((_tag: string, _profile: unknown) => pending);
    const adapter = createInvalidateTagAdapter(revalidateTagSpy);

    const result = adapter("tag-3", "max");
    expect(result).toBe(pending);
    expect(revalidateTagSpy).toHaveBeenCalledWith("tag-3", "max");

    resolve();
    await result;
  });
});
