import { CHAI_PACKAGE_NAME } from "~/edition/identity";

export function forbidGenericEntry(entry: "server" | "render"): never {
  throw new Error(
    `Do not import from "~/${entry}" or "${CHAI_PACKAGE_NAME}/${entry}". ` +
      `Use "~/nextjs/${entry}" or "${CHAI_PACKAGE_NAME}/nextjs/${entry}" for framework-specific APIs.`,
  );
}
