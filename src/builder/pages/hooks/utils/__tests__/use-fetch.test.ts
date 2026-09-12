/**
 * @vitest-environment happy-dom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { usePagesProp } from "~/builder/pages/hooks/project/use-builder-prop";
import { fetchAPI } from "~/builder/pages/utils/fetch-api";
import { useFetch } from "../use-fetch";

vi.mock("~/builder/pages/utils/fetch-api");
vi.mock("~/builder/pages/hooks/project/use-builder-prop");
describe("useFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("beforeRequest Hook Integration", () => {
    it("should call beforeRequest hook when provided", async () => {
      const mockBeforeRequest = vi.fn(async ({ action, data }) => ({ action, data }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: { test: "value" } });

      expect(mockBeforeRequest).toHaveBeenCalledWith({
        action: "TEST_ACTION",
        data: { test: "value" },
      });
    });

    it("should pass correct action and data to beforeRequest", async () => {
      const mockBeforeRequest = vi.fn(async ({ action, data }) => ({ action, data }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      const testData = { field: "title", keyword: "test" };
      await fetch("https://api.test.com", { action: "GENERATE_SEO_FIELD", data: testData });

      expect(mockBeforeRequest).toHaveBeenCalledWith({
        action: "GENERATE_SEO_FIELD",
        data: testData,
      });
    });

    it("should use modified data from beforeRequest", async () => {
      const mockBeforeRequest = vi.fn(async ({ action, data }) => ({
        action,
        data: { ...data, modified: true, extra: "field" },
      }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: { original: "value" } });

      expect(fetchAPI).toHaveBeenCalledWith(
        expect.any(String),
        { action: "TEST_ACTION", data: { original: "value", modified: true, extra: "field" } },
        expect.any(Object),
        undefined,
      );
    });

    it("should use modified action from beforeRequest", async () => {
      const mockBeforeRequest = vi.fn(async ({ data }) => ({
        action: "MODIFIED_ACTION",
        data,
      }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "ORIGINAL_ACTION", data: {} });

      expect(fetchAPI).toHaveBeenCalledWith(
        "https://api.test.com?action=modified_action",
        { action: "MODIFIED_ACTION", data: {} },
        expect.any(Object),
        undefined,
      );
    });

    it("should cancel request when beforeRequest returns null", async () => {
      const mockBeforeRequest = vi.fn(async () => null);
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      const response = await fetch("https://api.test.com", { action: "TEST_ACTION", data: {} });

      expect(response).toBeNull();
      expect(fetchAPI).not.toHaveBeenCalled();
    });

    it("should handle async beforeRequest (Promise return)", async () => {
      const mockBeforeRequest = vi.fn(
        ({ action, data }) =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ action, data: { ...data, async: true } }), 10);
          }),
      );
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: { test: "value" } });

      await waitFor(() => {
        expect(fetchAPI).toHaveBeenCalledWith(
          expect.any(String),
          { action: "TEST_ACTION", data: { test: "value", async: true } },
          expect.any(Object),
          undefined,
        );
      });
    });

    it("should handle sync beforeRequest (direct return)", async () => {
      const mockBeforeRequest = vi.fn(({ action, data }) => ({
        action,
        data: { ...data, sync: true },
      }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: { test: "value" } });

      expect(fetchAPI).toHaveBeenCalledWith(
        expect.any(String),
        { action: "TEST_ACTION", data: { test: "value", sync: true } },
        expect.any(Object),
        undefined,
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle errors thrown in beforeRequest hook", async () => {
      const mockBeforeRequest = vi.fn(async () => {
        throw new Error("beforeRequest error");
      });
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      // Should continue with original request despite error
      await fetch("https://api.test.com", { action: "TEST_ACTION", data: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in beforeRequest hook:", expect.any(Error));
      expect(fetchAPI).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should not break when beforeRequest returns invalid data", async () => {
      const mockBeforeRequest = vi.fn(async () => "invalid" as any);
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      // Should use original request when return is invalid
      await fetch("https://api.test.com", { action: "TEST_ACTION", data: { test: "value" } });

      expect(fetchAPI).toHaveBeenCalledWith(
        expect.any(String),
        { action: "TEST_ACTION", data: { test: "value" } },
        expect.any(Object),
        undefined,
      );
    });

    it("should log errors from beforeRequest appropriately", async () => {
      const testError = new Error("Test error in hook");
      const mockBeforeRequest = vi.fn(async () => {
        throw testError;
      });
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: {} });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in beforeRequest hook:", testError);

      consoleErrorSpy.mockRestore();
    });

    it("should continue with original request if beforeRequest fails", async () => {
      const mockBeforeRequest = vi.fn(async () => {
        throw new Error("Hook failed");
      });
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      const originalData = { test: "original" };
      await fetch("https://api.test.com", { action: "TEST_ACTION", data: originalData });

      expect(fetchAPI).toHaveBeenCalledWith(
        expect.any(String),
        { action: "TEST_ACTION", data: originalData },
        expect.any(Object),
        undefined,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle beforeRequest returning undefined", async () => {
      const mockBeforeRequest = vi.fn(async () => undefined as any);
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: { test: "value" } });

      expect(fetchAPI).toHaveBeenCalledWith(
        expect.any(String),
        { action: "TEST_ACTION", data: { test: "value" } },
        expect.any(Object),
        undefined,
      );
    });

    it("should handle beforeRequest modifying only action", async () => {
      const mockBeforeRequest = vi.fn(async ({ data }) => ({
        action: "NEW_ACTION",
        data,
      }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "OLD_ACTION", data: { test: "value" } });

      expect(fetchAPI).toHaveBeenCalledWith(
        "https://api.test.com?action=new_action",
        { action: "NEW_ACTION", data: { test: "value" } },
        expect.any(Object),
        undefined,
      );
    });

    it("should handle beforeRequest modifying only data", async () => {
      const mockBeforeRequest = vi.fn(async ({ action }) => ({
        action,
        data: { modified: "data" },
      }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: { original: "value" } });

      expect(fetchAPI).toHaveBeenCalledWith(
        expect.any(String),
        { action: "TEST_ACTION", data: { modified: "data" } },
        expect.any(Object),
        undefined,
      );
    });

    it("should handle beforeRequest with empty data object", async () => {
      const mockBeforeRequest = vi.fn(async ({ action, data }) => ({ action, data }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: {} });

      expect(mockBeforeRequest).toHaveBeenCalledWith({
        action: "TEST_ACTION",
        data: {},
      });
    });

    it("should preserve headers and options when using beforeRequest", async () => {
      const mockBeforeRequest = vi.fn(async ({ action, data }) => ({
        action,
        data: { ...data, modified: true },
      }));
      vi.mocked(usePagesProp).mockImplementation((key: string) => {
        if (key === "beforeRequest") return mockBeforeRequest;
        if (key === "getAccessToken") return vi.fn(async () => "mock-token");
        if (key === "onLogout") return vi.fn();
        return undefined;
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn(async () => ({ ok: true, data: { success: true } })),
      };
      vi.mocked(fetchAPI).mockResolvedValue(mockResponse as any);

      const { result } = renderHook(() => useFetch());
      const fetch = result.current;

      const customHeaders = { "X-Custom-Header": "test-value" };
      const abortController = new AbortController();

      await fetch("https://api.test.com", { action: "TEST_ACTION", data: { test: "value" } }, customHeaders, false, {
        signal: abortController.signal,
      });

      expect(fetchAPI).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        {
          ...customHeaders,
          Authorization: "Bearer mock-token",
        },
        { signal: abortController.signal },
      );
    });
  });
});
