import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("tailwind package contract", () => {
  const pkg = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
    peerDependencies: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    devDependencies: Record<string, string>;
  };

  it("declares Tailwind v4 as the supported peer", () => {
    expect(pkg.peerDependencies.tailwindcss).toMatch(/\^4\.0\.0/);
    expect(pkg.peerDependencies.tailwindcss).not.toMatch(/3\.0\.0/);
  });

  it("declares no autoprefixer peer (v3-only dependency)", () => {
    expect(pkg.peerDependencies.autoprefixer).toBeUndefined();
    expect(pkg.peerDependenciesMeta?.autoprefixer).toBeUndefined();
  });

  it("declares optional @tailwindcss/postcss peer for v4 hosts", () => {
    expect(pkg.peerDependencies["@tailwindcss/postcss"]).toMatch(/\^4\.0\.0/);
    expect(pkg.peerDependenciesMeta?.["@tailwindcss/postcss"]?.optional).toBe(true);
  });

  it("develops against Tailwind v4", () => {
    expect(pkg.devDependencies.tailwindcss).toMatch(/\^?4\./);
    expect(pkg.devDependencies["@tailwindcss/postcss"]).toMatch(/\^?4\./);
  });

  it("configures PostCSS with @tailwindcss/postcss", () => {
    const postcssConfig = readFileSync(path.join(packageRoot, "postcss.config.mjs"), "utf8");

    expect(postcssConfig).toContain("@tailwindcss/postcss");
    expect(postcssConfig).not.toMatch(/tailwindcss:\s*\{\}/);
    expect(postcssConfig).not.toContain("autoprefixer");
  });
});
