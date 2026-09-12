// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BindingExpressionInput } from "./expression-input";

const externalData = { global: { title: "Chai", count: 2 } };

/** Types into the input, carrying the caret position the component reads for tokenizing. */
const typeExpression = (input: HTMLInputElement, value: string) =>
  fireEvent.change(input, { target: { value, selectionStart: value.length } });

describe("BindingExpressionInput accessibility", () => {
  it("exposes the collapsed combobox before any suggestion is open", () => {
    render(<BindingExpressionInput value="" externalData={externalData} onValueChange={vi.fn()} />);

    const input = screen.getByRole("combobox");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("aria-activedescendant")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("points the combobox at the open listbox and its highlighted option", () => {
    const onValueChange = vi.fn();
    render(<BindingExpressionInput value="" externalData={externalData} onValueChange={onValueChange} />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeExpression(input, "global.");

    expect(input.getAttribute("aria-expanded")).toBe("true");
    const listbox = screen.getByRole("listbox");
    expect(input.getAttribute("aria-controls")).toBe(listbox.getAttribute("id"));

    const options = screen.getAllByRole("option");
    expect(options.map((option) => option.getAttribute("aria-selected"))).toEqual(["true", "false"]);
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].getAttribute("id"));

    // Arrow keys move the announced option, not just the highlight.
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[1].getAttribute("id"));
    expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
  });
});
