import { registerChaiFeatureFlag } from "~/builder/register-apis";

export const registerPagesFeatureFlags = () => {
  registerChaiFeatureFlag("dynamic-page-selector", {
    description: "Dynamic page selector",
  });
  registerChaiFeatureFlag("enable-add-page-dropdown", {
    description: "Enable add page dropdown",
  });
};
