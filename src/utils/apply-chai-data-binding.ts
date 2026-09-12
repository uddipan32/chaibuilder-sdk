import { applyBindingToBlockProps } from "~/render/apply-binding";

export const applyChaiDataBinding = (
  block: Record<string, any>,
  pageExternalData: Record<string, any>,
  locale: string = "en",
) => {
  return applyBindingToBlockProps(block as any, pageExternalData, { index: -1, key: "", locale });
};
