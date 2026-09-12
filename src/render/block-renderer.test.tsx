// @vitest-environment happy-dom
import { screen } from "@testing-library/react";
import { renderToReadableStream } from "react-dom/server.browser";
import { describe, expect, it } from "vitest";
import { registerChaiBlock, registerChaiBlockProps, stylesProp } from "~/registry";
import type { ChaiBlock } from "~/types/common";
import { CollectionItem, CollectionItemConfig } from "~/web-blocks/custom/collection-item";
import { RenderBlock } from "./block-renderer";
import { RenderBlocks } from "./blocks-renderer";

const DefaultComponent = () => <div>default counter</div>;
const MinimalComponent = () => <div>minimal counter</div>;

registerChaiBlock(DefaultComponent as any, {
  type: "VariantRenderBlock",
  label: "Variant Render Block",
  group: "basic",
  variants: { minimal: MinimalComponent as any },
});

const StyledComponent = (props: any) => (
  <div data-testid="styled" {...props.styles}>
    styled counter
  </div>
);

registerChaiBlock(StyledComponent as any, {
  type: "StyleVariantRenderBlock",
  label: "Style Variant Render Block",
  group: "basic",
  props: registerChaiBlockProps({ properties: { styles: stylesProp("text-4xl") } }),
  variants: { boxed: { styles: "border p-6" } },
});

// `RenderBlock` is an async server component (it awaits data providers inline;
// see inline-data-providers.ts), so RTL's synchronous client `render()` cannot
// resolve it. Stream the tree to HTML — which fully resolves async components —
// and mount the markup so the existing `screen` queries keep working unchanged.
const mountStream = async (element: React.ReactElement) => {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  document.body.innerHTML = await new Response(stream as any).text();
};

const renderBlock = (block: ChaiBlock) =>
  mountStream(
    <RenderBlock
      {...({ blocks: [block], lang: "en", fallbackLang: "en", draft: false } as any)}
      block={block}
      children={() => null}
    />,
  );

describe("RenderBlock variant resolution", () => {
  it("renders the default component when no variant is set", async () => {
    await renderBlock({ _id: "b1", _type: "VariantRenderBlock" });
    expect(screen.getByText("default counter")).toBeDefined();
  });

  it("renders the variant component named by _variant", async () => {
    await renderBlock({ _id: "b2", _type: "VariantRenderBlock", _variant: "minimal" });
    expect(screen.getByText("minimal counter")).toBeDefined();
  });

  it("falls back to the default component for a stale variant name", async () => {
    await renderBlock({ _id: "b3", _type: "VariantRenderBlock", _variant: "removed" });
    expect(screen.getByText("default counter")).toBeDefined();
  });

  it("renders nothing for an unregistered block type", async () => {
    await renderBlock({ _id: "b4", _type: "NotRegisteredBlock" });
    expect(document.body.textContent).toBe("");
  });
});

describe("RenderBlock with style variants", () => {
  // Style variants are applied in the builder, so the renderer must stay
  // oblivious to them: it renders the default component and the block's own
  // saved styles, with no variant lookup.
  it("renders the block's saved styles untouched", async () => {
    await renderBlock({
      _id: "s1",
      _type: "StyleVariantRenderBlock",
      _variant: "boxed",
      styles: "#styles:,border p-6",
    });

    expect(screen.getByText("styled counter")).toBeDefined();
    expect(screen.getByTestId("styled").className).toBe("border p-6");
  });
});

describe("RenderBlocks CollectionItem", () => {
  registerChaiBlock(CollectionItem as any, CollectionItemConfig as any);
  const ContentComponent = (props: any) => <p>{props.content}</p>;
  registerChaiBlock(ContentComponent as any, {
    type: "CollectionItemTestContent",
    label: "Collection Item Test Content",
    group: "basic",
  });

  const blocks: ChaiBlock[] = [
    { _id: "ci", _type: "CollectionItem", tag: "div", repeaterItems: "{{#agents}}" },
    { _id: "child", _type: "CollectionItemTestContent", _parent: "ci", content: "By {{$item.name}}" },
  ];

  const renderWithData = (externalData: Record<string, unknown>) =>
    mountStream(<RenderBlocks {...({ blocks, lang: "en", fallbackLang: "en", draft: false, externalData } as any)} />);

  it("renders children with $item resolved against the found item", async () => {
    await renderWithData({ "#agents/ci": [{ name: "Ann" }] });
    expect(screen.getByText("By Ann")).toBeDefined();
  });

  it("renders nothing on the live site when the find returned no item", async () => {
    await renderWithData({ "#agents/ci": [] });
    expect(document.body.textContent).toBe("");
  });

  it("renders nothing on the live site when no source is bound", async () => {
    await mountStream(
      <RenderBlocks
        {...({
          blocks: [{ _id: "ci2", _type: "CollectionItem", tag: "div", repeaterItems: "" }],
          lang: "en",
          fallbackLang: "en",
          draft: false,
          externalData: {},
        } as any)}
      />,
    );
    expect(document.body.textContent).toBe("");
  });
});
