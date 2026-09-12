export function forbidGenericEntry(entry: "server" | "render"): never {
  throw new Error(
    `Do not import from "~/${entry}" or "chaicore/${entry}". ` +
      `Use "~/nextjs/${entry}" or "chaicore/nextjs/${entry}" for framework-specific APIs.`,
  );
}
