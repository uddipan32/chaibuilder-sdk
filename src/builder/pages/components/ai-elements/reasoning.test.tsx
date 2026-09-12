/**
 * @vitest-environment happy-dom
 */
/**
 * Unit tests for the real getLastLines / getThinkingLabel helpers exported
 * from reasoning.tsx (previously this file tested stale, re-implemented
 * copies that had already drifted from the actual component logic).
 */
import { render, screen } from "@testing-library/react";
import { getLastLines, getThinkingLabel, Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning";

describe("getLastLines", () => {
  it("should return empty string for empty input", () => {
    expect(getLastLines("", 2)).toBe("");
  });

  it("should return original text when lines are less than limit", () => {
    const text = "Line 1\nLine 2";
    expect(getLastLines(text, 5)).toBe(text);
  });

  it("should return last N lines when text has more lines", () => {
    const text = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
    expect(getLastLines(text, 2)).toBe("Line 4\nLine 5");
  });

  it("should filter empty lines", () => {
    const text = "Line 1\n\nLine 2\n\nLine 3\n\n";
    expect(getLastLines(text, 2)).toBe("Line 2\nLine 3");
  });

  it("should handle single line", () => {
    const text = "Single line";
    expect(getLastLines(text, 2)).toBe(text);
  });

  it("should handle exactly N lines", () => {
    const text = "Line 1\nLine 2";
    expect(getLastLines(text, 2)).toBe(text);
  });

  it("should return last 1 line", () => {
    const text = "Line 1\nLine 2\nLine 3";
    expect(getLastLines(text, 1)).toBe("Line 3");
  });
});

describe("getThinkingLabel", () => {
  it("should show 'Thinking...' when streaming starts", () => {
    expect(getThinkingLabel(true, false, undefined, 0)).toBe("Thinking...");
  });

  it("should show elapsed time while streaming", () => {
    expect(getThinkingLabel(true, false, undefined, 5)).toBe("Thinking... 5s");
  });

  it("should show 'Thought for a few seconds' when duration is 0", () => {
    expect(getThinkingLabel(false, false, 0)).toBe("Thought for a few seconds");
  });

  it("should show 'Thought for a few seconds' when duration is undefined", () => {
    expect(getThinkingLabel(false, false, undefined)).toBe("Thought for a few seconds");
  });

  it("should show final duration after streaming ends", () => {
    expect(getThinkingLabel(false, false, 3)).toBe("Thought for 3 seconds");
    expect(getThinkingLabel(false, false, 10)).toBe("Thought for 10 seconds");
  });

  it("freezes to 'Thinking stopped' when the run was stopped mid-thought (regression)", () => {
    expect(getThinkingLabel(true, true, undefined, 5)).toBe("Thinking stopped");
  });

  it("stopped takes priority even if streaming has already flipped false", () => {
    expect(getThinkingLabel(false, true, 3)).toBe("Thinking stopped");
  });
});

describe("Reasoning auto-collapse", () => {
  it("collapses when stopped mid-thought even though isStreaming is still true (regression)", () => {
    // The SDK's reasoning part can stay isStreaming=true after a user Stop --
    // nothing ever marks it done. isStopped must be its own end-of-stream
    // signal for the auto-close effect, or the block never collapses despite
    // its label already reading "Thinking stopped".
    const { rerender } = render(
      <Reasoning isStreaming={true} isStopped={false} defaultOpen={true}>
        <ReasoningTrigger />
        <ReasoningContent>some reasoning text</ReasoningContent>
      </Reasoning>,
    );
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true");

    rerender(
      <Reasoning isStreaming={true} isStopped={true} defaultOpen={true}>
        <ReasoningTrigger />
        <ReasoningContent>some reasoning text</ReasoningContent>
      </Reasoning>,
    );
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false");
  });
});
