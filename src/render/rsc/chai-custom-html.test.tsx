import { describe, expect, it } from "vitest";
import { parseHeadElements } from "./chai-custom-html";

describe("parseHeadElements", () => {
  it("extracts meta tags with all attributes", () => {
    const { metas } = parseHeadElements(
      '<meta name="description" content="hello"><meta property="og:title" content="Title">',
    );
    expect(metas).toEqual([
      { key: "meta-0", attributes: { name: "description", content: "hello" } },
      { key: "meta-1", attributes: { property: "og:title", content: "Title" } },
    ]);
  });

  it("extracts link tags with all attributes", () => {
    const { links } = parseHeadElements('<link rel="stylesheet" href="/a.css"><link rel="icon" href="/favicon.ico">');
    expect(links).toEqual([
      { key: "link-0", attributes: { rel: "stylesheet", href: "/a.css" } },
      { key: "link-1", attributes: { rel: "icon", href: "/favicon.ico" } },
    ]);
  });

  it("extracts style tag contents", () => {
    const { styles } = parseHeadElements("<style>.x{color:red}</style><style>body{margin:0}</style>");
    expect(styles).toEqual([
      { key: "style-0", content: ".x{color:red}" },
      { key: "style-1", content: "body{margin:0}" },
    ]);
  });

  it("extracts external scripts with src separated from the other attributes", () => {
    const { scripts } = parseHeadElements('<script src="https://x.com/a.js" defer data-id="ga"></script>');
    expect(scripts).toEqual([
      {
        key: "script-0",
        src: "https://x.com/a.js",
        content: "",
        attributes: { defer: "", "data-id": "ga" },
      },
    ]);
  });

  it("extracts inline scripts with their content", () => {
    const { scripts } = parseHeadElements('<script>console.log("hi")</script>');
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe("");
    expect(scripts[0].content).toBe('console.log("hi")');
  });

  it("finds elements nested inside other elements", () => {
    const result = parseHeadElements('<div><meta name="a" content="1"><section><style>.y{}</style></section></div>');
    expect(result.metas).toHaveLength(1);
    expect(result.styles).toHaveLength(1);
  });

  it("collects every kind of head element from a mixed snippet", () => {
    const result = parseHeadElements(`
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.example.com">
      <style>h1{font-weight:700}</style>
      <script src="https://cdn.example.com/lib.js" async></script>
      <script>window.dataLayer = window.dataLayer || []</script>
    `);
    expect(result.metas).toHaveLength(1);
    expect(result.links).toHaveLength(1);
    expect(result.styles).toHaveLength(1);
    expect(result.scripts).toHaveLength(2);
    expect(result.scripts[0].src).toBe("https://cdn.example.com/lib.js");
    expect(result.scripts[1].content).toContain("dataLayer");
  });

  it("returns empty collections for empty, plain-text, and elementless input", () => {
    for (const input of ["", "just some text", "<!-- comment only -->"]) {
      expect(parseHeadElements(input)).toEqual({ metas: [], scripts: [], links: [], styles: [] });
    }
  });

  it("represents boolean attributes as empty strings", () => {
    const { scripts } = parseHeadElements('<script src="/a.js" async defer></script>');
    expect(scripts[0].attributes).toEqual({ async: "", defer: "" });
  });

  it("survives malformed html without throwing", () => {
    expect(() => parseHeadElements('<meta name="unclosed content="x"><script src="/a.js">')).not.toThrow();
  });
});
