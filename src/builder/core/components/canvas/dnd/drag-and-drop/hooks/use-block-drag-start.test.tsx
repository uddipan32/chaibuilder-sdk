/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activePanel: "add-block" as string | null,
  clearHighlight: vi.fn(),
  publish: vi.fn(),
  setActivePanel: vi.fn(),
  setAtom: vi.fn(),
  setPanelSwap: vi.fn(),
  setSelectedBlockIds: vi.fn(),
  setStyleBlocks: vi.fn(),
}));

vi.mock("jotai", () => ({ atom: (value: unknown) => value, useAtom: () => [null, mocks.setAtom] }));
vi.mock("~/builder/core/pubsub", () => ({ pubsub: { publish: mocks.publish } }));
vi.mock("~/builder/hooks/use-block-highlight", () => ({
  useBlockHighlight: () => ({ clearHighlight: mocks.clearHighlight }),
}));
vi.mock("~/builder/hooks/use-selected-blockIds", () => ({
  useSelectedBlockIds: () => [[], mocks.setSelectedBlockIds],
}));
vi.mock("~/builder/hooks/use-selected-styling-blocks", () => ({
  useSelectedStylingBlocks: () => [[], mocks.setStyleBlocks],
}));
vi.mock("~/builder/hooks/use-sidebar-active-panel", () => ({
  useSidebarActivePanel: () => [mocks.activePanel, mocks.setActivePanel],
  useSidebarPanelSwap: () => [null, mocks.setPanelSwap],
}));

import { useBlockDragStart } from "./use-block-drag-start";

const dragEvent = () => ({ dataTransfer: { effectAllowed: "", setData: vi.fn(), setDragImage: vi.fn() } }) as any;

describe("useBlockDragStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activePanel = "add-block";
  });

  it("shows Outline when a block is dragged from the Add panel", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBlockDragStart());

    act(() => result.current(dragEvent(), {} as any, true));
    expect(mocks.setActivePanel).not.toHaveBeenCalled();

    act(() => vi.runAllTimers());

    expect(mocks.setActivePanel).toHaveBeenCalledWith("outline");
    vi.useRealTimers();
  });

  it("starts the panel swap so Add Blocks slides out before Outline slides in", () => {
    const { result } = renderHook(() => useBlockDragStart());

    act(() => result.current(dragEvent(), {} as any, true));

    expect(mocks.setPanelSwap).toHaveBeenCalledWith("add-block");
  });

  it("does not swap panels when the drag starts outside the Add Blocks panel", () => {
    mocks.activePanel = "images";
    const { result } = renderHook(() => useBlockDragStart());

    act(() => result.current(dragEvent(), {} as any, true));

    expect(mocks.setPanelSwap).not.toHaveBeenCalled();
  });

  it("keeps the active panel when moving an existing canvas block", () => {
    const { result } = renderHook(() => useBlockDragStart());

    act(() => result.current(dragEvent(), {} as any, false));

    expect(mocks.setActivePanel).not.toHaveBeenCalled();
    expect(mocks.setPanelSwap).not.toHaveBeenCalled();
  });
});
