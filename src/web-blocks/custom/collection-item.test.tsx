// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionItem, CollectionItemConfig } from "./collection-item";

const FILTER = [{ field: "slug", operator: "equals", value: "a" }];

const renderItem = (props: Record<string, any>) =>
  render(
    <CollectionItem {...({ tag: "div", styles: {}, blockProps: {}, filters: FILTER, ...props } as any)}>
      <p>child content</p>
    </CollectionItem>,
  );

const NOT_FOUND = /No item found/;
const NO_FILTER = /Add a filter to find an item/;

describe("CollectionItem", () => {
  it("renders children on the live site when the find returned an item", () => {
    renderItem({ repeaterItems: [{ name: "Ann" }] });
    expect(screen.getByText("child content")).toBeDefined();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it("renders nothing on the live site for an empty find", () => {
    const { container } = renderItem({ repeaterItems: [] });
    expect(container.textContent).toBe("");
  });

  it("renders nothing on the live site when the item never resolved", () => {
    const { container } = renderItem({ repeaterItems: undefined });
    expect(container.textContent).toBe("");
  });

  it("shows the not-found strip in the builder for an empty find", () => {
    renderItem({ inBuilder: true, repeaterItems: [] });
    expect(screen.getByText(NOT_FOUND)).toBeDefined();
    // children stay on the canvas so the layout is still editable
    expect(screen.getByText("child content")).toBeDefined();
  });

  it.each([
    ["undefined", undefined],
    ["an unresolved binding string", ""],
  ])("shows the not-found strip in the builder when the item is %s", (_label, repeaterItems) => {
    renderItem({ inBuilder: true, repeaterItems });
    expect(screen.getByText(NOT_FOUND)).toBeDefined();
    expect(screen.getByText("child content")).toBeDefined();
  });

  it.each([
    ["no filters prop", undefined],
    ["an empty filters array", []],
  ])("asks for a filter in the builder when the block has %s", (_label, filters) => {
    renderItem({ inBuilder: true, repeaterItems: undefined, filters });
    expect(screen.getByText(NO_FILTER)).toBeDefined();
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
  });

  it("hides the strip in the builder once an item is found", () => {
    renderItem({ inBuilder: true, repeaterItems: [{ name: "Ann" }] });
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
    expect(screen.getByText("child content")).toBeDefined();
  });

  it("shows the loading skeleton instead of the strip while the find is in flight", () => {
    renderItem({ inBuilder: true, $loading: true, repeaterItems: undefined });
    expect(screen.queryByText(NOT_FOUND)).toBeNull();
    expect(screen.queryByText("child content")).toBeNull();
  });

  it("has no sortBy prop — the find always uses the source's own order", () => {
    expect(Object.keys((CollectionItemConfig.props as any).schema.properties)).not.toContain("sortBy");
    expect(CollectionItemConfig.dataProviderDependencies).toEqual(["repeaterItems", "filters"]);
  });
});
