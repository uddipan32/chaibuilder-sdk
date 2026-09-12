import { describe, expect, it } from "vitest";
import { toReactDomAttributes } from "./react-dom-attributes";

describe("toReactDomAttributes", () => {
  it("maps HTML attribute names to their React DOM property names", () => {
    expect(toReactDomAttributes({ datetime: "2026-08-04", colspan: "2", for: "field-1" })).toEqual({
      dateTime: "2026-08-04",
      colSpan: "2",
      htmlFor: "field-1",
    });
  });

  it("maps hyphenated names that React camelCases", () => {
    expect(toReactDomAttributes({ "http-equiv": "refresh", "accept-charset": "utf-8" })).toEqual({
      httpEquiv: "refresh",
      acceptCharset: "utf-8",
    });
  });

  it("is case-insensitive on the authored name", () => {
    expect(toReactDomAttributes({ DateTime: "x", TABINDEX: "0" })).toEqual({ dateTime: "x", tabIndex: "0" });
  });

  it("passes through data-*, aria-* and single-word attributes untouched", () => {
    const attrs = {
      "data-animation": "fade-in|ease-out|500|0|once",
      "aria-label": "Close",
      role: "button",
      id: "hero",
      title: "Hello",
    };
    expect(toReactDomAttributes(attrs)).toEqual(attrs);
  });

  it("passes through unknown custom attributes untouched", () => {
    expect(toReactDomAttributes({ "x-on:click": "open()", myattr: "1" })).toEqual({
      "x-on:click": "open()",
      myattr: "1",
    });
  });

  it("coerces boolean attributes so the string 'false' turns the attribute off", () => {
    expect(toReactDomAttributes({ readonly: "false", disabled: "true", hidden: "" })).toEqual({
      readOnly: false,
      disabled: true,
      hidden: true,
    });
  });

  it("maps class to className so callers can merge it with generated styles", () => {
    expect(toReactDomAttributes({ class: "mt-4" })).toEqual({ className: "mt-4" });
  });

  it("returns an empty object for empty input", () => {
    expect(toReactDomAttributes({})).toEqual({});
  });
});
