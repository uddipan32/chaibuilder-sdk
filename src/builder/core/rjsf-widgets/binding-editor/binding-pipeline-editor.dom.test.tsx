// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BindingPipelineEditor } from "./binding-pipeline-editor";

describe("BindingPipelineEditor", () => {
  it("shows a live preview and can remove or reorder pipes", () => {
    const onChange = vi.fn();
    render(
      <BindingPipelineEditor
        expression="title | trim | uppercase"
        externalData={{ title: " chai " }}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("CHAI")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Move Uppercase up" }));
    expect(onChange).toHaveBeenLastCalledWith("title | uppercase | trim");

    fireEvent.click(screen.getByRole("button", { name: "Remove Trim" }));
    expect(onChange).toHaveBeenLastCalledWith("title | uppercase");
  });

  it("renders metadata-driven argument controls", () => {
    const onChange = vi.fn();
    render(
      <BindingPipelineEditor expression="price | currency 'USD'" externalData={{ price: 25 }} onChange={onChange} />,
    );

    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "EUR" } });
    expect(onChange).toHaveBeenCalledWith("price | currency 'EUR'");
  });

  it("offers one-click conversion for recognized invalid expressions", () => {
    const onChange = vi.fn();
    render(
      <BindingPipelineEditor expression="title.toUpperCase()" externalData={{ title: "chai" }} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Convert to pipes" }));
    expect(onChange).toHaveBeenCalledWith("title | uppercase");
  });

  it("hides boolean formatters from regular bindings", () => {
    render(<BindingPipelineEditor expression="price" externalData={{ price: 25 }} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Add pipe" }));
    expect(screen.queryByText("Greater than")).toBeNull();
    expect(screen.getByText("Currency")).toBeDefined();
  });

  it("offers boolean formatters for conditional visibility", () => {
    render(
      <BindingPipelineEditor expression="price" externalData={{ price: 25 }} usage="visibility" onChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Add pipe" }));
    expect(screen.getByText("Greater than")).toBeDefined();
  });
});
