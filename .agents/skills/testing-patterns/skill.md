---
description: Testing patterns and best practices for ChaiBuilder Core
---

# Testing Patterns for ChaiBuilder Core

This skill defines the testing patterns and best practices for the ChaiBuilder Core codebase.

## Core Principles

The project has two distinct parts with different testing approaches:

1. **Core** (`pro/core/`): Pure React components with no external connections
   - Uses Jotai atoms for state management
   - **NO MOCKING** of internal hooks or atoms
   - Test with real implementations

2. **Pages** (`pro/pages/`): Website builder with data fetching
   - Uses React Query for data fetching and mutations
   - Uses MSW (Mock Service Worker) for API mocking
   - **NO MOCKING** of React Query hooks

## General Rules

### ✅ DO

- Co-locate test files with source files (e.g., `component.tsx` and `component.test.tsx`)
- Use real implementations of internal code
- Mock only external dependencies (browser APIs, third-party services)
- Write clear, descriptive test names
- Follow Arrange-Act-Assert pattern
- Clean up after each test
- Rely on Vitest globals (no need to import `describe`, `expect`, `it`, `vi`, etc.)

### ❌ DON'T

- Mock internal hooks or atoms
- Mock React Query hooks
- Mock Jotai atoms
- Create excessive mocks for things that can be tested directly
- Mock utility functions from the same codebase
- Import Vitest functions (`describe`, `expect`, `it`, `vi`, etc.) - they're globally available

## Vitest Configuration

The project uses `globals: true` in `vitest.config.ts`, which means all Vitest functions are automatically available globally:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true, // Makes describe, it, expect, vi, etc. globally available
    environment: "happy-dom",
    // ... other config
  },
});
```

### ❌ DON'T Import Vitest Functions

```typescript
// ❌ BAD - Unnecessary imports
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("MyComponent", () => {
  it("works", () => {
    expect(true).toBe(true);
  });
});
```

### ✅ Use Globals Directly

```typescript
// ✅ GOOD - No imports needed
describe("MyComponent", () => {
  beforeEach(() => {
    // Setup
  });

  it("works", () => {
    expect(true).toBe(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
```

All these functions are available globally:

- `describe`, `it`, `test`
- `expect`
- `vi` (for mocking)
- `beforeEach`, `afterEach`, `beforeAll`, `afterAll`

## Core Testing Pattern

For components in `pro/core/`, use real Jotai atoms and hooks.

### Example: Testing with Jotai Atoms

```typescript
import { renderHook } from "@testing-library/react";
import { useAtom } from "jotai";
import { Provider } from "jotai";
import { myAtom } from "./atoms";

// ✅ GOOD - Use real atoms with Provider
test("atom updates correctly", () => {
  const { result } = renderHook(() => useAtom(myAtom), {
    wrapper: ({ children }) => <Provider>{children}</Provider>,
  });

  act(() => {
    result.current[1]("new value");
  });

  expect(result.current[0]).toBe("new value");
});

// ❌ BAD - Don't mock atoms
vi.mock("./atoms", () => ({
  myAtom: vi.fn(),
}));
```

### Using Core Test Utilities

```typescript
import { render, renderHook } from "~/core/__tests__/test-utils";
import { MyComponent } from "./my-component";

test("renders component with Jotai provider", () => {
  const { getByText } = render(<MyComponent />);
  expect(getByText("Hello")).toBeInTheDocument();
});
```

### Testing Hooks that Use Atoms

```typescript
import { renderHook } from "@testing-library/react";
import { useAtom } from "jotai";
import { selectedBlockIdsAtom } from "~/hooks/use-selected-blockIds";
import { CoreTestProvider } from "~/core/__tests__/test-utils";

// ✅ GOOD - Test real hook behavior
test("useSelectedBlockIds manages selection", () => {
  const { result } = renderHook(
    () => {
      const [ids, setIds] = useAtom(selectedBlockIdsAtom);
      return { ids, setIds };
    },
    { wrapper: CoreTestProvider },
  );

  act(() => {
    result.current.setIds(["block-1", "block-2"]);
  });

  expect(result.current.ids).toEqual(["block-1", "block-2"]);
});

// ❌ BAD - Don't mock the hook
vi.mock("~/hooks/use-selected-blockIds");
```

## Pages Testing Pattern

For components in `pro/pages/`, use MSW to mock API calls.

### Example: Testing with MSW

```typescript
import { http, HttpResponse } from "msw";
import { server } from "~/__mocks__/server";
import { render, waitFor } from "~/pages/__tests__/test-utils";
import { PageList } from "./page-list";

// ✅ GOOD - Mock API with MSW
test("fetches and displays pages", async () => {
  server.use(
    http.get("/api/pages", () => {
      return HttpResponse.json({
        pages: [
          { id: "1", title: "Home" },
          { id: "2", title: "About" },
        ],
      });
    })
  );

  const { getByText } = render(<PageList />);

  await waitFor(() => {
    expect(getByText("Home")).toBeInTheDocument();
    expect(getByText("About")).toBeInTheDocument();
  });
});

// ❌ BAD - Don't mock React Query hooks
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));
```

### Using Pages Test Utilities

```typescript
import { render, createTestQueryClient } from "~/pages/__tests__/test-utils";
import { MyPageComponent } from "./my-page-component";

test("renders page component with providers", () => {
  const queryClient = createTestQueryClient();
  const { getByText } = render(<MyPageComponent />, { queryClient });
  expect(getByText("Page Content")).toBeInTheDocument();
});
```

### Testing Mutations

```typescript
import { http, HttpResponse } from "msw";
import { server } from "~/__mocks__/server";
import { render, waitFor, screen } from "~/pages/__tests__/test-utils";
import { CreatePageForm } from "./create-page-form";

test("creates a new page", async () => {
  let capturedData: any;

  server.use(
    http.post("/api/pages", async ({ request }) => {
      capturedData = await request.json();
      return HttpResponse.json({ id: "new-page", ...capturedData });
    })
  );

  const { getByLabelText, getByRole } = render(<CreatePageForm />);

  const input = getByLabelText("Page Title");
  await userEvent.type(input, "New Page");

  const submitButton = getByRole("button", { name: /create/i });
  await userEvent.click(submitButton);

  await waitFor(() => {
    expect(capturedData).toEqual({ title: "New Page" });
  });
});
```

## When Mocking IS Acceptable

You should mock:

### 1. External Browser APIs

```typescript
// ✅ GOOD - Mock browser APIs
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
};

const mockDocument = {
  documentElement: {
    classList: mockClassList,
  },
};
```

### 2. Third-Party Services

```typescript
// ✅ GOOD - Mock external services
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    auth: vi.fn(),
  })),
}));
```

### 3. File System Operations

```typescript
// ✅ GOOD - Mock Node.js modules
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));
```

### 4. Complex External Libraries with Side Effects

```typescript
// ✅ GOOD - Mock libraries that have complex setup
vi.mock("monaco-editor", () => ({
  editor: {
    create: vi.fn(),
  },
}));
```

## Test Structure

### Organize Tests with Describe Blocks

```typescript
describe("MyComponent", () => {
  describe("when user is authenticated", () => {
    it("displays user dashboard", () => {
      // Test implementation
    });

    it("shows logout button", () => {
      // Test implementation
    });
  });

  describe("when user is not authenticated", () => {
    it("redirects to login", () => {
      // Test implementation
    });
  });
});
```

### Use Clear Test Names

```typescript
// ✅ GOOD - Descriptive test names
test("displays error message when API returns 404", () => {});
test("updates block position when drag ends", () => {});
test("filters pages by selected language", () => {});

// ❌ BAD - Vague test names
test("works correctly", () => {});
test("test 1", () => {});
test("handles error", () => {});
```

### Follow Arrange-Act-Assert

```typescript
test("adds block to selection", () => {
  // Arrange
  const { result } = renderHook(() => useSelectedBlockIds(), {
    wrapper: CoreTestProvider,
  });

  // Act
  act(() => {
    result.current[1](["block-1"]);
  });

  // Assert
  expect(result.current[0]).toEqual(["block-1"]);
});
```

## Common Patterns

### Testing Components with Multiple Atoms

```typescript
import { useAtom } from "jotai";
import { renderHook } from "@testing-library/react";
import { CoreTestProvider } from "~/core/__tests__/test-utils";
import { selectedBlockIdsAtom } from "~/atoms/blocks";
import { darkModeAtom } from "~/atoms/theme";

test("component uses multiple atoms", () => {
  const { result } = renderHook(
    () => ({
      blockIds: useAtom(selectedBlockIdsAtom),
      darkMode: useAtom(darkModeAtom),
    }),
    { wrapper: CoreTestProvider },
  );

  // Test with real atoms
  act(() => {
    result.current.blockIds[1](["block-1"]);
    result.current.darkMode[1](true);
  });

  expect(result.current.blockIds[0]).toEqual(["block-1"]);
  expect(result.current.darkMode[0]).toBe(true);
});
```

### Testing Error States with MSW

```typescript
import { http, HttpResponse } from "msw";
import { server } from "~/__mocks__/server";

test("displays error when API fails", async () => {
  server.use(
    http.get("/api/pages", () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  const { getByText } = render(<PageList />);

  await waitFor(() => {
    expect(getByText(/error loading pages/i)).toBeInTheDocument();
  });
});
```

### Testing Loading States

```typescript
import { http, HttpResponse, delay } from "msw";
import { server } from "~/__mocks__/server";

test("shows loading state while fetching", async () => {
  server.use(
    http.get("/api/pages", async () => {
      await delay(100);
      return HttpResponse.json({ pages: [] });
    })
  );

  const { getByText, queryByText } = render(<PageList />);

  expect(getByText(/loading/i)).toBeInTheDocument();

  await waitFor(() => {
    expect(queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
```

## Migration Guide

When updating existing tests:

1. **Identify the test location**: Is it in `core/` or `pages/`?
2. **Remove unnecessary mocks**: Delete `vi.mock()` calls for internal code
3. **Add proper providers**: Use test utilities from `__tests__/test-utils`
4. **For pages tests**: Replace hook mocks with MSW handlers
5. **For core tests**: Use real atoms with Jotai Provider
6. **Run tests**: Ensure they still pass

### Example Migration

**Before:**

```typescript
vi.mock("~/hooks/use-theme");
vi.mock("~/hooks/use-selected-blockIds");

test("my test", () => {
  (useTheme as Mock).mockReturnValue([{ colors: {} }]);
  (useSelectedBlockIds as Mock).mockReturnValue([[]]);
  // test code
});
```

**After:**

```typescript
import { useAtom } from "jotai";
import { renderHook } from "@testing-library/react";
import { CoreTestProvider } from "~/core/__tests__/test-utils";
import { chaiThemeValuesAtom } from "~/hooks/use-theme";
import { selectedBlockIdsAtom } from "~/hooks/use-selected-blockIds";

test("my test", () => {
  const { result } = renderHook(
    () => ({
      theme: useAtom(chaiThemeValuesAtom),
      blockIds: useAtom(selectedBlockIdsAtom),
    }),
    { wrapper: CoreTestProvider },
  );

  // Initialize atoms with test data
  act(() => {
    result.current.theme[1]({ colors: {} });
    result.current.blockIds[1]([]);
  });

  // test code with real atoms
});
```

## Summary

- **Core tests**: Use real Jotai atoms, no mocking internal code
- **Pages tests**: Use MSW for API mocking, no mocking React Query
- **Mock only**: External APIs, browser APIs, third-party services
- **Co-locate**: Test files with source files
- **Be descriptive**: Clear test names and structure
- **Test behavior**: Not implementation details
