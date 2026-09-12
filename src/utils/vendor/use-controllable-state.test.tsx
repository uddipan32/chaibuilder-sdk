/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useControllableState } from "./use-controllable-state";

describe("useControllableState (uncontrolled)", () => {
  it("starts from defaultProp and updates on setValue", () => {
    const { result } = renderHook(() => useControllableState({ defaultProp: false }));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });

  it("fires onChange when the value changes", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultProp: false, onChange }));
    act(() => result.current[1](true));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("supports functional updaters", () => {
    const { result } = renderHook(() => useControllableState({ defaultProp: 1 }));
    act(() => result.current[1]((prev) => (prev ?? 0) + 1));
    expect(result.current[0]).toBe(2);
  });
});

describe("useControllableState (controlled)", () => {
  it("reflects the prop and ignores internal updates", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ prop }) => useControllableState({ prop, defaultProp: false, onChange }),
      {
        initialProps: { prop: false },
      },
    );

    act(() => result.current[1](true));
    // value stays controlled by the prop, but the change is reported
    expect(result.current[0]).toBe(false);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender({ prop: true });
    expect(result.current[0]).toBe(true);
  });

  it("does not fire onChange when setting the same value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ prop: true, defaultProp: false, onChange }));
    act(() => result.current[1](true));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("switches from uncontrolled to controlled when a prop appears", () => {
    const { result, rerender } = renderHook(
      ({ prop }: { prop: number | undefined }) => useControllableState({ prop, defaultProp: 0 }),
      { initialProps: { prop: undefined as number | undefined } },
    );
    expect(result.current[0]).toBe(0);
    rerender({ prop: 5 });
    expect(result.current[0]).toBe(5);
  });
});
