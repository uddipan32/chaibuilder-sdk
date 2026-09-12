/**
 * @vitest-environment happy-dom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StickToBottom, useStickToBottomContext } from "./use-stick-to-bottom";

const ContextProbe = () => {
  const { isAtBottom } = useStickToBottomContext();
  return <span data-testid="probe">{String(isAtBottom)}</span>;
};

describe("StickToBottom", () => {
  it("applies the caller's props to the actual scrolling element, not a non-scrolling wrapper (regression)", () => {
    // A className/role passed to StickToBottom describes the scrollable log
    // region itself -- e.g. "no-scrollbar" only hides a native scrollbar when
    // it lands on the element that has overflow-y-auto. Landing it on an inert
    // outer wrapper instead is exactly the bug this guards against: the
    // scrollbar stays visible and overlaps content that has no room for it.
    render(
      <StickToBottom className="outer" role="log" data-testid="root">
        <StickToBottom.Content>
          <p>hello</p>
        </StickToBottom.Content>
      </StickToBottom>,
    );
    const root = screen.getByTestId("root");
    expect(root.className).toContain("outer");
    expect(root.className).toContain("overflow-y-auto");
    expect(root.getAttribute("role")).toBe("log");
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("keeps the scrolling element position:static so an absolutely-positioned child anchors to the outer wrapper, not the scroller (regression)", () => {
    // A floating scroll-to-bottom button rendered as a child here must stay
    // pinned to the outer (non-scrolling) wrapper. If the scrolling div also
    // ends up position:relative -- e.g. because "relative" leaked in from a
    // className shared with the outer div -- it becomes the nearest
    // positioned ancestor instead, and the button scrolls away with the
    // transcript rather than floating above the composer.
    render(
      <StickToBottom className="relative flex-1" data-testid="scroller">
        <StickToBottom.Content>
          <p>hello</p>
        </StickToBottom.Content>
      </StickToBottom>,
    );
    const scroller = screen.getByTestId("scroller");
    expect(scroller.className).toContain("static");
    expect(scroller.parentElement?.className).toContain("relative");
  });

  it("provides context to descendants, defaulting to at-bottom", () => {
    render(
      <StickToBottom>
        <StickToBottom.Content>
          <ContextProbe />
        </StickToBottom.Content>
      </StickToBottom>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("true");
  });

  it("throws when the context is used outside the provider", () => {
    expect(() => render(<ContextProbe />)).toThrow(/within a StickToBottom/);
  });
});
