import { describe, expect, it } from "vitest";
import type { ChaiBlock } from "~/types/common";
import type { ChaiRepeaterDataEntry } from "~/types/repeater-data";
import { blockFiltersHaveBindings, buildRepeaterQuery } from "./build-repeater-query";

const source: ChaiRepeaterDataEntry = {
  id: "blog",
  name: "Blog",
  fields: [
    { id: "title", label: "Title", type: "text" },
    { id: "views", label: "Views", type: "number" },
    { id: "featured", label: "Featured", type: "boolean" },
    { id: "category", label: "Category", type: "select", options: [{ label: "News", value: "news" }] },
    { id: "slug", label: "Slug", type: "text" },
    { id: "internal", label: "Internal", type: "text", filterable: false, sortable: false },
  ],
  defaultSort: [{ field: "title", direction: "asc" }],
  defaultLimit: 12,
  maxLimit: 50,
  fetch: async () => ({ items: [] }),
};

const ctx = { pageProps: { slug: "/blog/current-post", pageBaseSlug: "/blog" }, lang: "en" };

const block = (props: Record<string, unknown>): ChaiBlock => ({ _id: "A", _type: "Repeater", ...props }) as ChaiBlock;

describe("buildRepeaterQuery", () => {
  it("keeps valid filters and preserves field/operator/value", () => {
    const query = buildRepeaterQuery(source, block({ filters: [{ field: "title", operator: "contains", value: "x" }] }), ctx);
    expect(query.filters).toEqual([{ field: "title", operator: "contains", value: "x" }]);
  });

  it("drops unknown, non-filterable fields and invalid operators", () => {
    const query = buildRepeaterQuery(
      source,
      block({
        filters: [
          { field: "nope", operator: "equals", value: "x" },
          { field: "internal", operator: "equals", value: "x" },
          { field: "title", operator: "greater_than", value: "x" },
          { field: "views", operator: "contains", value: "5" },
        ],
      }),
      ctx,
    );
    expect(query.filters).toEqual([]);
  });

  it("coerces number and boolean values, drops NaN and empty", () => {
    const query = buildRepeaterQuery(
      source,
      block({
        filters: [
          { field: "views", operator: "greater_than", value: "10" },
          { field: "views", operator: "less_than", value: "abc" },
          { field: "featured", operator: "equals", value: "true" },
          { field: "title", operator: "equals", value: "" },
        ],
      }),
      ctx,
    );
    expect(query.filters).toEqual([
      { field: "views", operator: "greater_than", value: 10 },
      { field: "featured", operator: "equals", value: true },
    ]);
  });

  it("resolves $page.* dynamic tokens from context", () => {
    const query = buildRepeaterQuery(
      source,
      block({
        filters: [
          { field: "slug", operator: "not_equals", value: "$page.slug" },
          { field: "title", operator: "equals", value: "$page.baseSlug" },
          { field: "category", operator: "equals", value: "$page.lang" },
        ],
      }),
      ctx,
    );
    expect(query.filters).toEqual([
      { field: "slug", operator: "not_equals", value: "/blog/current-post" },
      { field: "title", operator: "equals", value: "/blog" },
      { field: "category", operator: "equals", value: "en" },
    ]);
  });

  it("resolves tokens inside array values and drops empties", () => {
    const emptyCtx = { pageProps: {}, lang: "en" };
    const query = buildRepeaterQuery(
      source,
      block({ filters: [{ field: "category", operator: "in", value: ["news", "$page.slug"] }] }),
      emptyCtx,
    );
    expect(query.filters).toEqual([{ field: "category", operator: "in", value: ["news"] }]);
  });

  it("rejects array values on scalar operators and scalar values on in/not_in", () => {
    const query = buildRepeaterQuery(
      source,
      block({
        filters: [
          { field: "title", operator: "equals", value: ["a", "b"] },
          { field: "title", operator: "contains", value: ["a"] },
          { field: "category", operator: "in", value: "news" },
          { field: "category", operator: "not_in", value: ["news"] },
        ],
      }),
      ctx,
    );
    expect(query.filters).toEqual([{ field: "category", operator: "not_in", value: ["news"] }]);
  });

  it("resolves a string {{...}} binding from externalData on scalar operators", () => {
    const bindingCtx = { ...ctx, externalData: { listing: { city: "Austin" }, global: { brand: "Acme" } } };
    const query = buildRepeaterQuery(
      source,
      block({
        filters: [
          { field: "title", operator: "equals", value: "{{listing.city}}" },
          { field: "slug", operator: "contains", value: "{{global.brand}}-homes" },
        ],
      }),
      bindingCtx,
    );
    expect(query.filters).toEqual([
      { field: "title", operator: "equals", value: "Austin" },
      { field: "slug", operator: "contains", value: "Acme-homes" },
    ]);
  });

  it("resolves an array {{...}} binding on in/not_in and drops non-array bindings", () => {
    const bindingCtx = { ...ctx, externalData: { listing: { tags: ["news", "featured"], city: "Austin" } } };
    const query = buildRepeaterQuery(
      source,
      block({
        filters: [
          { field: "category", operator: "in", value: "{{listing.tags}}" },
          { field: "category", operator: "not_in", value: "{{listing.city}}" },
        ],
      }),
      bindingCtx,
    );
    expect(query.filters).toEqual([{ field: "category", operator: "in", value: ["news", "featured"] }]);
  });

  it("drops filters whose binding cannot resolve (no externalData)", () => {
    const query = buildRepeaterQuery(
      source,
      block({
        filters: [
          { field: "title", operator: "equals", value: "{{listing.city}}" },
          { field: "category", operator: "in", value: "{{listing.tags}}" },
        ],
      }),
      ctx,
    );
    expect(query.filters).toEqual([]);
  });

  it("drops a scalar filter whose binding resolves to an array", () => {
    const bindingCtx = { ...ctx, externalData: { listing: { tags: ["a"] } } };
    const query = buildRepeaterQuery(
      source,
      block({ filters: [{ field: "title", operator: "equals", value: "{{listing.tags}}" }] }),
      bindingCtx,
    );
    expect(query.filters).toEqual([]);
  });

  it("drops a filter whose dynamic token resolves to nothing", () => {
    const query = buildRepeaterQuery(
      source,
      block({ filters: [{ field: "slug", operator: "not_equals", value: "$page.slug" }] }),
      { pageProps: {}, lang: "en" },
    );
    expect(query.filters).toEqual([]);
  });

  it("keeps sortable sorts, drops the rest, falls back to defaultSort", () => {
    const query = buildRepeaterQuery(
      source,
      block({
        sortBy: [
          { field: "views", direction: "desc" },
          { field: "internal", direction: "asc" },
          { field: "title", direction: "sideways" },
        ],
      }),
      ctx,
    );
    expect(query.sort).toEqual([{ field: "views", direction: "desc" }]);

    const fallback = buildRepeaterQuery(source, block({}), ctx);
    expect(fallback.sort).toEqual([{ field: "title", direction: "asc" }]);
  });

  it("applies defaultLimit and clamps to maxLimit", () => {
    expect(buildRepeaterQuery(source, block({}), ctx).limit).toBe(12);
    expect(buildRepeaterQuery(source, block({ limit: 3 }), ctx).limit).toBe(3);
    expect(buildRepeaterQuery(source, block({ limit: 500 }), ctx).limit).toBe(50);
  });

  it("survives malformed client props", () => {
    const query = buildRepeaterQuery(source, block({ filters: "junk", sortBy: { bad: true }, limit: "NaN" }), ctx);
    expect(query).toEqual({ filters: [], sort: [{ field: "title", direction: "asc" }], limit: 12 });
  });
});

describe("blockFiltersHaveBindings", () => {
  it("detects {{...}} bindings in stored filter values", () => {
    expect(blockFiltersHaveBindings(block({ filters: [{ field: "title", operator: "equals", value: "{{a.b}}" }] }))).toBe(
      true,
    );
    expect(blockFiltersHaveBindings(block({ filters: [{ field: "title", operator: "equals", value: "plain" }] }))).toBe(
      false,
    );
    expect(blockFiltersHaveBindings(block({}))).toBe(false);
    expect(blockFiltersHaveBindings(block({ filters: "junk" }))).toBe(false);
  });
});
