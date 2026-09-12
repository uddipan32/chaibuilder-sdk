import type { ChaiFrameworkAdapter } from "~/server/framework-adapter";

export const createInvalidateTagAdapter = (
  revalidateTag: ChaiFrameworkAdapter["invalidateTag"],
): ChaiFrameworkAdapter["invalidateTag"] =>
  revalidateTag.length >= 2
    ? (tag, profile) => revalidateTag(tag, profile)
    : (tag) => revalidateTag(tag);
