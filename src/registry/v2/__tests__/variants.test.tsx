import { memo } from "react";
import { registerChaiBlockProps, stylesProp } from "../..";
import {
  getBlockDefaultProps,
  getBlockFormSchemas,
  getChaiBlockStyleVariantProps,
  getRegisteredChaiBlock,
  registerChaiBlock,
  resolveChaiBlockComponent,
} from "../runtime/core";

const DefaultComponent = () => null;
const MinimalComponent = () => null;
const HeroComponent = () => null;

const baseConfig = (type: string) => ({
  type,
  label: type,
  group: "basic",
  props: registerChaiBlockProps({
    properties: {
      title: { type: "string", default: "Hello" },
    },
  }),
});

describe("block variants registration", () => {
  it("stores registered variants on the registry entry", () => {
    registerChaiBlock(DefaultComponent, {
      ...baseConfig("VariantBlock"),
      variants: { minimal: MinimalComponent, hero: HeroComponent },
    });

    const registered = getRegisteredChaiBlock("VariantBlock");
    expect(registered?.variants).toEqual({ minimal: MinimalComponent, hero: HeroComponent });
    expect(registered?.component).toBe(DefaultComponent);
  });

  it("leaves variants undefined for blocks registered without them", () => {
    registerChaiBlock(DefaultComponent, baseConfig("PlainBlock"));

    expect(getRegisteredChaiBlock("PlainBlock")?.variants).toBeUndefined();
  });

  it("keeps previously registered variants when re-registered without the key", () => {
    registerChaiBlock(DefaultComponent, {
      ...baseConfig("StickyVariantBlock"),
      variants: { minimal: MinimalComponent },
    });
    registerChaiBlock(DefaultComponent, baseConfig("StickyVariantBlock"));

    expect(getRegisteredChaiBlock("StickyVariantBlock")?.variants).toEqual({ minimal: MinimalComponent });
  });
});

describe("resolveChaiBlockComponent", () => {
  beforeEach(() => {
    registerChaiBlock(DefaultComponent, {
      ...baseConfig("ResolveBlock"),
      variants: { minimal: MinimalComponent },
    });
  });

  it("returns the default component when no variant is set", () => {
    const registered = getRegisteredChaiBlock("ResolveBlock");
    expect(resolveChaiBlockComponent(registered, undefined)).toBe(DefaultComponent);
    expect(resolveChaiBlockComponent(registered, "")).toBe(DefaultComponent);
  });

  it("returns the variant component for a known variant name", () => {
    expect(resolveChaiBlockComponent(getRegisteredChaiBlock("ResolveBlock"), "minimal")).toBe(MinimalComponent);
  });

  it("falls back to the default component for a stale or unknown variant name", () => {
    expect(resolveChaiBlockComponent(getRegisteredChaiBlock("ResolveBlock"), "removed")).toBe(DefaultComponent);
  });

  it("falls back to the default component when the block has no variants", () => {
    registerChaiBlock(DefaultComponent, baseConfig("NoVariantsBlock"));
    expect(resolveChaiBlockComponent(getRegisteredChaiBlock("NoVariantsBlock"), "minimal")).toBe(DefaultComponent);
  });

  it("returns null for an unregistered block", () => {
    expect(resolveChaiBlockComponent(getRegisteredChaiBlock("NeverRegistered"), "minimal")).toBeNull();
    expect(resolveChaiBlockComponent(null, "minimal")).toBeNull();
  });
});

describe("style variants", () => {
  const styleConfig = (type: string) => ({
    type,
    label: type,
    group: "basic",
    props: registerChaiBlockProps({
      properties: {
        styles: stylesProp("text-4xl"),
        activeItemStyle: stylesProp("bg-primary"),
      },
    }),
  });

  it("keeps the default component when the selected variant is a style variant", () => {
    registerChaiBlock(DefaultComponent, {
      ...styleConfig("StyleVariantBlock"),
      variants: { boxed: { styles: "border p-6" } },
    });

    expect(resolveChaiBlockComponent(getRegisteredChaiBlock("StyleVariantBlock"), "boxed")).toBe(DefaultComponent);
  });

  it("returns the variant's classes as style props to write into the block", () => {
    registerChaiBlock(DefaultComponent, {
      ...styleConfig("StyleReplaceBlock"),
      variants: { boxed: { styles: "border p-6" } },
    });

    expect(getChaiBlockStyleVariantProps(getRegisteredChaiBlock("StyleReplaceBlock"), "boxed")).toEqual({
      styles: "#styles:,border p-6",
    });
  });

  it("returns several style props at once", () => {
    registerChaiBlock(DefaultComponent, {
      ...styleConfig("MultiStyleBlock"),
      variants: { dots: { styles: "w-2 h-2", activeItemStyle: "bg-black" } },
    });

    expect(getChaiBlockStyleVariantProps(getRegisteredChaiBlock("MultiStyleBlock"), "dots")).toEqual({
      styles: "#styles:,w-2 h-2",
      activeItemStyle: "#styles:,bg-black",
    });
  });

  it("resets props the selected variant does not set back to their schema default", () => {
    registerChaiBlock(DefaultComponent, {
      ...styleConfig("ResetStyleBlock"),
      variants: {
        dots: { styles: "w-2 h-2", activeItemStyle: "bg-black" },
        bars: { styles: "h-1 w-6" },
      },
    });
    const registered = getRegisteredChaiBlock("ResetStyleBlock");

    // switching dots -> bars must not leave the dots activeItemStyle behind
    expect(getChaiBlockStyleVariantProps(registered, "bars")).toEqual({
      styles: "#styles:,h-1 w-6",
      activeItemStyle: "#styles:,bg-primary",
    });
    // back to Default restores every controlled prop
    expect(getChaiBlockStyleVariantProps(registered, "")).toEqual({
      styles: "#styles:,text-4xl",
      activeItemStyle: "#styles:,bg-primary",
    });
  });

  it("passes through an author-supplied full #styles: string verbatim", () => {
    registerChaiBlock(DefaultComponent, {
      ...styleConfig("BaseSegmentBlock"),
      variants: { boxed: { styles: "#styles:flex items-center,border p-6" } },
    });

    expect(getChaiBlockStyleVariantProps(getRegisteredChaiBlock("BaseSegmentBlock"), "boxed")).toEqual({
      styles: "#styles:flex items-center,border p-6",
    });
  });

  it("returns undefined for blocks with no style variants", () => {
    registerChaiBlock(DefaultComponent, {
      ...styleConfig("ComponentOnlyBlock"),
      variants: { minimal: MinimalComponent },
    });

    expect(getChaiBlockStyleVariantProps(getRegisteredChaiBlock("ComponentOnlyBlock"), "minimal")).toBeUndefined();
    expect(getChaiBlockStyleVariantProps(getRegisteredChaiBlock("NeverRegistered"), "x")).toBeUndefined();
  });

  it("treats a memo-wrapped component as a component variant, not a style variant", () => {
    const MemoComponent = memo(MinimalComponent);
    registerChaiBlock(DefaultComponent, {
      ...styleConfig("MemoVariantBlock"),
      variants: { wrapped: MemoComponent as any },
    });
    const registered = getRegisteredChaiBlock("MemoVariantBlock");

    expect(resolveChaiBlockComponent(registered, "wrapped")).toBe(MemoComponent);
    expect(getChaiBlockStyleVariantProps(registered, "wrapped")).toBeUndefined();
  });

  it("lists style variants in the same dropdown as component variants", () => {
    registerChaiBlock(DefaultComponent, {
      ...styleConfig("MixedVariantBlock"),
      variants: { minimal: MinimalComponent, boxed: { styles: "border p-6" } },
    });

    const { schema } = getBlockFormSchemas("MixedVariantBlock") as any;
    expect(schema.properties._variant.oneOf.map((option: any) => option.const)).toEqual(["", "minimal", "boxed"]);
  });
});

describe("variant dropdown in the settings form schema", () => {
  it("injects a _variant select listing Default plus every variant", () => {
    registerChaiBlock(DefaultComponent, {
      ...baseConfig("FormVariantBlock"),
      variants: { minimal: MinimalComponent, heroCentered: HeroComponent },
    });

    const { schema } = getBlockFormSchemas("FormVariantBlock") as any;

    expect(schema.properties._variant).toEqual({
      type: "string",
      title: "Variant",
      default: "",
      oneOf: [
        { const: "", title: "Default" },
        { const: "minimal", title: "Minimal" },
        { const: "heroCentered", title: "Hero Centered" },
      ],
    });
    // author props are preserved alongside the injected select
    expect(schema.properties.title).toBeDefined();
  });

  it("does not inject _variant for blocks without variants", () => {
    registerChaiBlock(DefaultComponent, baseConfig("FormPlainBlock"));

    const { schema } = getBlockFormSchemas("FormPlainBlock") as any;
    expect(schema.properties._variant).toBeUndefined();
  });

  it("reflects the new variant list when a type is re-registered", () => {
    registerChaiBlock(DefaultComponent, {
      ...baseConfig("RefreshVariantBlock"),
      variants: { minimal: MinimalComponent },
    });
    expect((getBlockFormSchemas("RefreshVariantBlock") as any).schema.properties._variant.oneOf).toHaveLength(2);

    registerChaiBlock(DefaultComponent, {
      ...baseConfig("RefreshVariantBlock"),
      variants: { minimal: MinimalComponent, hero: HeroComponent },
    });

    const oneOf = (getBlockFormSchemas("RefreshVariantBlock") as any).schema.properties._variant.oneOf;
    expect(oneOf.map((option: any) => option.const)).toEqual(["", "minimal", "hero"]);
  });

  it("prepends _variant to an explicit ui:order", () => {
    registerChaiBlock(DefaultComponent, {
      ...baseConfig("OrderedVariantBlock"),
      props: registerChaiBlockProps({
        properties: { title: { type: "string", default: "Hello" } },
        ui: { "ui:order": ["title"] },
      } as any),
      variants: { minimal: MinimalComponent },
    });

    const { uiSchema } = getBlockFormSchemas("OrderedVariantBlock") as any;
    expect(uiSchema["ui:order"]).toEqual(["_variant", "title"]);
  });

  it("does not mutate the registered uiSchema across repeated reads", () => {
    registerChaiBlock(DefaultComponent, {
      ...baseConfig("StableOrderBlock"),
      props: registerChaiBlockProps({
        properties: { title: { type: "string", default: "Hello" } },
        ui: { "ui:order": ["title"] },
      } as any),
      variants: { minimal: MinimalComponent },
    });

    getBlockFormSchemas("StableOrderBlock");
    const { uiSchema } = getBlockFormSchemas("StableOrderBlock") as any;
    expect(uiSchema["ui:order"]).toEqual(["_variant", "title"]);
  });

  it("keeps _variant out of the block default props", () => {
    registerChaiBlock(DefaultComponent, {
      ...baseConfig("DefaultsVariantBlock"),
      variants: { minimal: MinimalComponent },
    });

    expect(getBlockDefaultProps("DefaultsVariantBlock")).toEqual({ title: "Hello" });
  });
});
