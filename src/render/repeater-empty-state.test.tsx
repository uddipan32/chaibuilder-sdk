// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { renderToReadableStream } from "react-dom/server.browser";
import { describe, expect, it } from "vitest";
import { registerChaiBlock } from "~/registry";
import type { ChaiBlock } from "~/types/common";
import {
  Repeater,
  RepeaterConfig,
  RepeaterEmptyState,
  RepeaterEmptyStateConfig,
  RepeaterItem,
  RepeaterItemConfig,
} from "~/web-blocks/custom/repeater";
import { RenderBlocks } from "./blocks-renderer";

// `RenderBlock` is an async server component, so RTL's synchronous client
// `render()` cannot resolve it. Stream to HTML and mount the markup so
// `screen` queries keep working. Same helper as block-renderer.test.tsx.
const mountStream = async (element: React.ReactElement) => {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  document.body.innerHTML = await new Response(stream as any).text();
};

registerChaiBlock(Repeater as any, RepeaterConfig as any);
registerChaiBlock(RepeaterItem as any, RepeaterItemConfig as any);
registerChaiBlock(RepeaterEmptyState as any, RepeaterEmptyStateConfig as any);

const RowContent = (props: any) => <span>{props.content}</span>;
registerChaiBlock(RowContent as any, {
  type: "RepeaterTestContent",
  label: "Repeater Test Content",
  group: "basic",
});

// A Repeater bound to `#jobs` with a per-row RepeaterItem subtree and a
// sibling RepeaterEmptyState subtree — the two slots the renderer gates.
const blocks: ChaiBlock[] = [
  { _id: "rep", _type: "Repeater", tag: "ul", repeaterItems: "{{#jobs}}" },
  { _id: "item", _type: "RepeaterItem", _parent: "rep", parentTag: "ul" },
  { _id: "row", _type: "RepeaterTestContent", _parent: "item", content: "Job row" },
  { _id: "empty", _type: "RepeaterEmptyState", _parent: "rep" },
  { _id: "emptyRow", _type: "RepeaterTestContent", _parent: "empty", content: "No jobs available" },
];

const renderWithData = (externalData: Record<string, unknown>) =>
  mountStream(<RenderBlocks {...({ blocks, lang: "en", fallbackLang: "en", draft: false, externalData } as any)} />);

describe("RenderBlocks Repeater empty state", () => {
  it("renders one row per item and hides the empty state when the collection has items", async () => {
    await renderWithData({ "#jobs/rep": [{}, {}, {}] });
    expect(screen.getAllByText("Job row")).toHaveLength(3);
    expect(screen.queryByText("No jobs available")).toBeNull();
  });

  it("renders the empty state exactly once and no rows when the collection is empty", async () => {
    await renderWithData({ "#jobs/rep": [] });
    expect(screen.getAllByText("No jobs available")).toHaveLength(1);
    expect(screen.queryByText("Job row")).toBeNull();
  });

  it("renders nothing when no collection is bound", async () => {
    await mountStream(
      <RenderBlocks
        {...({
          blocks: [
            { _id: "rep2", _type: "Repeater", tag: "ul", repeaterItems: "" },
            { _id: "empty2", _type: "RepeaterEmptyState", _parent: "rep2" },
            { _id: "emptyRow2", _type: "RepeaterTestContent", _parent: "empty2", content: "No jobs available" },
          ],
          lang: "en",
          fallbackLang: "en",
          draft: false,
          externalData: {},
        } as any)}
      />,
    );
    // Runtime ignores the builder-only preview toggle: an unbound Repeater
    // resolves to no array, so neither rows nor the empty state render.
    expect(document.body.textContent).toBe("");
  });
});
