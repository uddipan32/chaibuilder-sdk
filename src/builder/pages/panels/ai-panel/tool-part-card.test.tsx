/**
 * @vitest-environment happy-dom
 */
import { render, screen } from "@testing-library/react";
import { ToolPartCard } from "./tool-part-card";

describe("ToolPartCard", () => {
  it("never renders the AI SDK's raw errorText for a tool-input validation failure (regression)", () => {
    // part.errorText is the SDK's own raw internal message for a tool call
    // that failed input-schema validation before execute() ever ran. The
    // model already sees and self-corrects from it on its own next turn --
    // the user should never see this technical text in the chat.
    render(
      <ToolPartCard
        part={{
          type: "tool-edit_block",
          state: "output-error",
          errorText:
            "Invalid input for tool edit_block: Type validation failed: Value: {...}. " +
            "Error message: [{ \"code\": \"too_big\", \"maximum\": 8 }]",
        }}
      />,
    );
    expect(screen.queryByText(/too_big/)).toBeNull();
    expect(screen.queryByText(/Type validation failed/)).toBeNull();
  });

  it("still shows our own controlled error message from a tool's execute() output", () => {
    render(
      <ToolPartCard
        part={{
          type: "tool-edit_block",
          state: "output-available",
          output: { ok: false, error: "Block not found." },
        }}
      />,
    );
    expect(screen.getByText("Block not found.")).toBeTruthy();
  });

  it("labels a failed call with its active-state label, not 'Done'", () => {
    render(
      <ToolPartCard
        part={{
          type: "tool-edit_block",
          state: "output-error",
          errorText: "raw sdk error",
        }}
      />,
    );
    expect(screen.getByText("Updating section…")).toBeTruthy();
    expect(screen.queryByText("Done")).toBeNull();
  });

  it("shows a failed task label without the running ellipsis", () => {
    render(
      <ToolPartCard
        part={{
          type: "tool-edit_block",
          state: "output-error",
          input: { task: "Update hero section" },
        }}
      />,
    );
    expect(screen.getByText("Update hero section")).toBeTruthy();
    expect(screen.queryByText("Update hero section…")).toBeNull();
  });

  it("shows the running state with the active label", () => {
    render(<ToolPartCard part={{ type: "tool-edit_block", state: "input-available" }} />);
    expect(screen.getByText("Updating section…")).toBeTruthy();
  });

  it("shows the done state with the done label", () => {
    render(<ToolPartCard part={{ type: "tool-edit_block", state: "output-available", output: { ok: true } }} />);
    expect(screen.getByText("Updated section")).toBeTruthy();
  });
});
