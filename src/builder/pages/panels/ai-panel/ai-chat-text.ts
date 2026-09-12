/**
 * The AI panel is for non-technical users. Assistant chat text must never
 * surface generated code — raw HTML/markup, fenced code blocks, or inline code.
 * Generated markup flows to the canvas preview and is summarised by the task
 * cards; the chat only shows plain-language prose.
 *
 * This strips any code from a streamed assistant text part. If what remains is
 * empty (the part was pure code), the caller should render nothing.
 */
export const stripGeneratedCode = (text: string): string => {
  if (!text) return "";
  return (
    text
      // Completed fenced code blocks: ```lang\n...\n```
      .replace(/```[\s\S]*?```/g, "")
      // Unterminated fenced block still streaming in
      .replace(/```[\s\S]*$/g, "")
      // Inline code spans: `foo`
      .replace(/`[^`]*`/g, "")
      // Raw HTML / <chai-*> web-component tags
      .replace(/<\/?[a-zA-Z][^>]*>/g, "")
      // Entity-escaped tags: &lt;chai-...&gt; / &lt;/div&gt;
      .replace(/&lt;\/?[a-zA-Z][\s\S]*?&gt;/g, "")
      // Collapse the blank lines left behind
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
};
