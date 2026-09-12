// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { SuggestionDropdown, type SuggestionDropdownRef } from "./suggestion-dropdown";
import { getBindingSuggestionItems } from "./use-binding-suggestion-items";

describe("binding suggestions", () => {
  it("sorts root and nested fields alphabetically before limiting results", () => {
    expect(getBindingSuggestionItems({ zebra: 1, Alpha: 2, beta: 3 }, "").map((item) => item.label)).toEqual([
      "Alpha",
      "beta",
      "zebra",
    ]);

    expect(
      getBindingSuggestionItems({ listing: { title10: "", Title2: "", address: "" } }, "listing.").map(
        (item) => item.label,
      ),
    ).toEqual(["address", "Title2", "title10"]);
  });

  it("scrolls keyboard selection into visible list area", () => {
    const ref = createRef<SuggestionDropdownRef>();
    const items = Array.from({ length: 10 }, (_, index) => ({
      path: `field${index}`,
      label: `field${index}`,
      type: "string",
      drillable: false,
    }));
    render(<SuggestionDropdown ref={ref} items={items} command={vi.fn()} />);

    const list = screen.getByRole("listbox");
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 48 });
    Array.from(list.children).forEach((item, index) => {
      Object.defineProperty(item, "offsetTop", { configurable: true, value: index * 20 });
      Object.defineProperty(item, "offsetHeight", { configurable: true, value: 20 });
    });

    act(() => {
      ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) });
      ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) });
      ref.current?.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) });
    });

    expect(list.scrollTop).toBe(32);
    expect(screen.getByRole("option", { name: /field3/ }).getAttribute("aria-selected")).toBe("true");
  });
});
