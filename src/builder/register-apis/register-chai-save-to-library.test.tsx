/**
 * @vitest-environment happy-dom
 */
import { renderHook } from "@testing-library/react";
import {
  registerChaiSaveToLibrary,
  resetSaveToLibrary,
  useSaveToLibraryComponent,
} from "~/builder/register-apis/register-chai-save-to-library";

describe("save-to-library", () => {
  beforeEach(() => {
    resetSaveToLibrary();
  });

  describe("registerSaveToLibrary", () => {
    it("should register a component", () => {
      const MockComponent = vi.fn(() => null);
      registerChaiSaveToLibrary(MockComponent);
      const { result } = renderHook(() => useSaveToLibraryComponent());
      expect(result.current).toBe(MockComponent);
    });
  });

  describe("useSaveToLibraryComponent", () => {
    it("should return null when no component is registered", () => {
      const { result } = renderHook(() => useSaveToLibraryComponent());
      expect(result.current).toBeNull();
    });

    it("should return registered component", () => {
      const MockComponent = vi.fn(() => null);
      registerChaiSaveToLibrary(MockComponent);
      const { result } = renderHook(() => useSaveToLibraryComponent());
      expect(result.current).toBe(MockComponent);
    });
  });
});
