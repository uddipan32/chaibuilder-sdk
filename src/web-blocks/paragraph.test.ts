import { unwrapBlockParagraph } from "~/web-blocks/paragraph";

describe("unwrapBlockParagraph", () => {
  test("unwraps a paragraph holding block-level content", () => {
    expect(unwrapBlockParagraph('<p style="text-align: left;"><h1>Routing</h1><p>Body</p></p>')).toBe(
      "<h1>Routing</h1><p>Body</p>",
    );
  });

  test("unwraps around a list", () => {
    expect(unwrapBlockParagraph("<p><ul><li>a</li></ul></p>")).toBe("<ul><li>a</li></ul>");
  });

  test("unwraps around a code block", () => {
    expect(unwrapBlockParagraph("<p><pre><code>x</code></pre></p>")).toBe("<pre><code>x</code></pre>");
  });

  test("tolerates surrounding whitespace", () => {
    expect(unwrapBlockParagraph("  <p><h2>t</h2></p>  ")).toBe("<h2>t</h2>");
  });

  test("leaves an ordinary inline paragraph alone", () => {
    expect(unwrapBlockParagraph("<p>plain text</p>")).toBe("<p>plain text</p>");
  });

  test("leaves inline markup alone", () => {
    expect(unwrapBlockParagraph('<p>a <strong>b</strong> <a href="#">c</a></p>')).toBe(
      '<p>a <strong>b</strong> <a href="#">c</a></p>',
    );
  });

  // Guards the depth walk: a greedy match to the final `</p>` would treat these
  // siblings as one wrapper and emit the broken `a</p><p>b`.
  test("leaves sibling paragraphs alone", () => {
    expect(unwrapBlockParagraph("<p>a</p><p>b</p>")).toBe("<p>a</p><p>b</p>");
  });

  test("leaves content that does not start with a paragraph alone", () => {
    expect(unwrapBlockParagraph("<h1>t</h1><p>b</p>")).toBe("<h1>t</h1><p>b</p>");
  });

  test("leaves content with trailing markup after the paragraph alone", () => {
    expect(unwrapBlockParagraph("<p><h1>t</h1></p><hr />")).toBe("<p><h1>t</h1></p><hr />");
  });

  test("handles empty content", () => {
    expect(unwrapBlockParagraph("")).toBe("");
  });

  test("unwraps the real docs binding output", () => {
    const resolved =
      '<p style="text-align: left;">' +
      '<h1 style="text-align: left;">Routing</h1>' +
      '<p style="text-align: left;">Vercel&#39;s CDN evaluates routing rules.</p>' +
      "<pre><code>store.set()</code></pre>" +
      "<blockquote>Blog quote</blockquote>" +
      "</p>";

    expect(unwrapBlockParagraph(resolved)).toBe(
      '<h1 style="text-align: left;">Routing</h1>' +
        '<p style="text-align: left;">Vercel&#39;s CDN evaluates routing rules.</p>' +
        "<pre><code>store.set()</code></pre>" +
        "<blockquote>Blog quote</blockquote>",
    );
  });
});
