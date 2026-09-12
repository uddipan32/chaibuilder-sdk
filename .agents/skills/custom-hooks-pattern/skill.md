# Custom Hooks Pattern

Apply the custom hooks pattern to separate business logic from UI presentation in React components.

## Pattern Overview

Extract stateful logic and side effects into custom hooks, keeping components as pure UI that consumes these hooks. This enables:

- **Independent testing** of logic without rendering UI
- **Reusable logic** across different components
- **Flexible UI** - anyone can create custom UI using the same hooks
- **Clear separation** between business logic and presentation

## When to Apply

✅ **Apply this pattern when:**

- Component has complex state management or side effects
- Logic could be reused in different UI contexts
- You want to test logic independently from UI
- Component mixes business logic with presentation

❌ **Skip this pattern when:**

- Component is simple with minimal logic
- Logic is tightly coupled to specific UI behavior
- Over-abstraction would reduce readability

## Implementation Steps

### 1. Identify Logic to Extract

Look for:

- `useState`, `useEffect`, `useMemo`, `useCallback` calls
- Data fetching, transformations, calculations
- Event handlers with business logic
- Form validation, state management

### 2. Create Custom Hook

```tsx
// Extract logic into a custom hook (prefix with 'use')
const useFeatureName = (params) => {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  const handlers = useMemo(
    () => ({
      handleAction: () => {
        /* logic */
      },
    }),
    [dependencies],
  );

  return { state, handlers };
};
```

### 3. Pure UI Component

```tsx
// Component becomes pure UI consuming the hook
export const FeatureComponent = (props) => {
  const { state, handlers } = useFeatureName(props);

  return <div>{/* Pure presentation using state and handlers */}</div>;
};
```

## File Organization

### File Structure Rules

**Single Component File:**

1. Imports at the top
2. Custom hooks (local to this component)
3. Comment divider: `// ============ Components ============`
4. Internal/private components (not exported)
5. Exported component(s) - **ALWAYS LAST**

```tsx
// feature.tsx
import { useState, useEffect } from "react";
import { api } from "~/api";

const useFeatureLogic = (id: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetch(id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading };
};

const useFeatureActions = (id: string) => {
  const handleSave = useCallback(() => {
    api.save(id);
  }, [id]);

  return { handleSave };
};

// ============ Components ============

const InternalComponent = () => {
  return <div>Internal helper component</div>;
};

export const Feature = ({ id }: { id: string }) => {
  const { data, loading } = useFeatureLogic(id);
  const { handleSave } = useFeatureActions(id);

  if (loading) return <div>Loading...</div>;
  return (
    <div onClick={handleSave}>
      {data}
      <InternalComponent />
    </div>
  );
};
```

**Multiple Components:**
If a file has multiple components, split them into separate files. Each file should contain:

- Only ONE exported component
- Hooks specific to that component
- Comment divider between hooks and component

```tsx
// Before (multiple components in one file - AVOID)
// features.tsx
const FeatureA = () => {
  /* ... */
};
const FeatureB = () => {
  /* ... */
};
const FeatureC = () => {
  /* ... */
};

// After (split into separate files - PREFERRED)
// feature-a.tsx
const useFeatureALogic = () => {
  /* ... */
};

// ============ Components ============

export const FeatureA = () => {
  /* ... */
};

// feature-b.tsx
const useFeatureBLogic = () => {
  /* ... */
};

// ============ Components ============

export const FeatureB = () => {
  /* ... */
};
```

### Local Hooks (Same File)

Keep hook in the same file when:

- Only used by one component
- Tightly coupled to component's purpose
- Not generic enough for reuse

**Structure:**

```tsx
// component.tsx
import { useState } from "react";

const useComponentLogic = () => {
  const [state, setState] = useState();
  return { state, setState };
};

// ============ Components ============

export const Component = () => {
  const logic = useComponentLogic();
  return <div>{/* UI */}</div>;
};
```

### Shared Hooks (Separate File)

Extract to separate file when:

- Used by multiple components
- Generic/reusable logic
- Complex enough to warrant isolation

**Structure:**

```tsx
// hooks/use-feature.ts
export const useFeature = () => {
  /* ... */
};

// components/feature-a.tsx
import { useFeature } from "../hooks/use-feature";

// ============ Components ============

export const FeatureA = () => {
  const logic = useFeature();
  return <div>{/* UI A */}</div>;
};

// components/feature-b.tsx
import { useFeature } from "../hooks/use-feature";

// ============ Components ============

export const FeatureB = () => {
  const logic = useFeature();
  return <div>{/* UI B */}</div>;
};
```

## Examples

### Example 1: Simple Data Transformation

**Before:**

```tsx
export const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then((data) => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);

  const displayName = useMemo(() => {
    return user ? `${user.firstName} ${user.lastName}` : "";
  }, [user]);

  if (loading) return <div>Loading...</div>;
  return <div>{displayName}</div>;
};
```

**After:**

```tsx
const useUserProfile = (userId: string) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then((data) => {
      setUser(data);
      setLoading(false);
    });
  }, [userId]);

  const displayName = useMemo(() => {
    return user ? `${user.firstName} ${user.lastName}` : "";
  }, [user]);

  return { user, loading, displayName };
};

export const UserProfile = ({ userId }: { userId: string }) => {
  const { loading, displayName } = useUserProfile(userId);

  if (loading) return <div>Loading...</div>;
  return <div>{displayName}</div>;
};
```

### Example 2: Form Logic with Validation

**Before:**

```tsx
export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = "Required";
    if (!password) newErrors.password = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      {errors.email && <span>{errors.email}</span>}
      <input value={password} onChange={(e) => setPassword(e.target.value)} />
      {errors.password && <span>{errors.password}</span>}
      <button disabled={submitting}>Login</button>
    </form>
  );
};
```

**After:**

```tsx
const useLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!email) newErrors.email = "Required";
    if (!password) newErrors.password = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate()) return;
      setSubmitting(true);
      await login(email, password);
      setSubmitting(false);
    },
    [email, password, validate],
  );

  return {
    fields: { email, password },
    setters: { setEmail, setPassword },
    errors,
    submitting,
    handleSubmit,
  };
};

export const LoginForm = () => {
  const { fields, setters, errors, submitting, handleSubmit } = useLoginForm();

  return (
    <form onSubmit={handleSubmit}>
      <input value={fields.email} onChange={(e) => setters.setEmail(e.target.value)} />
      {errors.email && <span>{errors.email}</span>}
      <input value={fields.password} onChange={(e) => setters.setPassword(e.target.value)} />
      {errors.password && <span>{errors.password}</span>}
      <button disabled={submitting}>Login</button>
    </form>
  );
};
```

### Example 3: Shared Hook (Generic)

```tsx
// hooks/use-pagination.ts
export const usePagination = <T>(items: T[], itemsPerPage: number = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage: () => goToPage(currentPage + 1),
    prevPage: () => goToPage(currentPage - 1),
  };
};

// components/user-list.tsx
export const UserList = ({ users }: { users: User[] }) => {
  const { paginatedItems, currentPage, totalPages, nextPage, prevPage } = usePagination(users, 20);

  return (
    <div>
      {paginatedItems.map(user => <UserCard key={user.id} user={user} />)}
      <div>
        <button onClick={prevPage}>Previous</button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={nextPage}>Next</button>
      </div>
    </div>
  );
};
```

## Testing

### Testing Philosophy

**CRITICAL: Never mock local/internal code. Only mock external dependencies.**

✅ **DO Mock:**

- External APIs (fetch, axios)
- Third-party services (Stripe, Auth0)
- Browser APIs when necessary (localStorage, window.location)
- System dependencies (timers, dates)

❌ **DO NOT Mock:**

- Your own hooks
- Your own components
- Your own utility functions
- State management (Jotai atoms, Redux stores)
- Internal business logic

### Why No Mocking for Local Code?

1. **Real Integration Testing**: Tests verify actual behavior, not mocked behavior
2. **Refactoring Safety**: Tests don't break when implementation changes
3. **Confidence**: You're testing what actually runs in production
4. **Simplicity**: Less test setup, more readable tests
5. **Bug Detection**: Real interactions catch edge cases mocks hide

### Testing Hooks Without Mocks

Use `@testing-library/react` with real state management:

```tsx
import { renderHook, act } from "@testing-library/react";
import { useAtom } from "jotai";
import { CoreTestProvider } from "~/core/__tests__/test-utils";
import { selectedBlockIdsAtom } from "~/hooks/use-selected-blockIds";

describe("useBlockSelection", () => {
  it("should handle block selection state changes", () => {
    // Use REAL atoms, not mocks
    const { result } = renderHook(
      () => {
        const [selectedIds, setSelectedIds] = useAtom(selectedBlockIdsAtom);
        return { selectedIds, setSelectedIds };
      },
      { wrapper: CoreTestProvider }, // Real provider
    );

    expect(result.current.selectedIds).toEqual([]);

    act(() => {
      result.current.setSelectedIds(["block-1"]);
    });

    expect(result.current.selectedIds).toEqual(["block-1"]);
  });

  it("should test business logic directly", () => {
    const { result } = renderHook(
      () => {
        const [selectedIds, setSelectedIds] = useAtom(selectedBlockIdsAtom);
        const [stylingBlocks, setStylingBlocks] = useAtom(selectedStylingBlocksAtom);

        // Test REAL logic, not mocked
        const handleParentSelect = (parentId: string) => {
          setStylingBlocks([]);
          setSelectedIds([parentId]);
        };

        return { selectedIds, stylingBlocks, handleParentSelect };
      },
      { wrapper: CoreTestProvider },
    );

    act(() => {
      result.current.handleParentSelect("parent-1");
    });

    expect(result.current.selectedIds).toEqual(["parent-1"]);
    expect(result.current.stylingBlocks).toEqual([]);
  });
});
```

### Testing Pure Logic Functions

Test utility functions and helpers directly:

```tsx
import { canDeleteBlock, canDuplicateBlock } from "~/core/functions/block-helpers";

describe("Block Capability Checks", () => {
  it("should correctly identify deletable blocks", () => {
    // No mocks needed - pure functions
    expect(canDeleteBlock("Box")).toBe(true);
    expect(canDeleteBlock("Text")).toBe(true);
    expect(canDeleteBlock("Slot")).toBe(false);
  });

  it("should correctly identify duplicatable blocks", () => {
    expect(canDuplicateBlock("Box")).toBe(true);
    expect(canDuplicateBlock("Slot")).toBe(false);
  });
});
```

### Testing Event Handlers

Test handler logic without mocking:

```tsx
describe("Event Handler Logic", () => {
  it("should prevent event propagation", () => {
    const handleClick = (e: { stopPropagation: () => void; preventDefault: () => void }) => {
      e.stopPropagation();
      e.preventDefault();
    };

    let propagationStopped = false;
    let defaultPrevented = false;

    const mockEvent = {
      stopPropagation: () => {
        propagationStopped = true;
      },
      preventDefault: () => {
        defaultPrevented = true;
      },
    };

    handleClick(mockEvent);

    expect(propagationStopped).toBe(true);
    expect(defaultPrevented).toBe(true);
  });
});
```

### Testing Conditional Rendering Logic

Test visibility and rendering conditions:

```tsx
describe("Visibility Logic", () => {
  it("should determine render visibility based on conditions", () => {
    const shouldRender = (
      isDragging: boolean,
      selectedElement: HTMLElement | null,
      block: Block | null,
      editingId: string | null,
    ) => {
      return isDragging || (selectedElement && block && !editingId);
    };

    expect(shouldRender(true, null, null, null)).toBe(true);

    const mockElement = document.createElement("div");
    const mockBlock = { _id: "block-1" } as Block;

    expect(shouldRender(false, mockElement, mockBlock, null)).toBe(true);
    expect(shouldRender(false, mockElement, mockBlock, "editing")).toBe(false);
  });
});
```

### Testing Components

Component tests focus on UI behavior with real hooks:

```tsx
import { render, screen } from "@testing-library/react";
import { CoreTestProvider } from "~/core/__tests__/test-utils";
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("renders form fields", () => {
    // Render with real provider, no mocks
    render(
      <CoreTestProvider>
        <LoginForm />
      </CoreTestProvider>,
    );

    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
```

### When to Mock (Rare Cases)

Only mock external dependencies:

```tsx
import { vi } from "vitest";

describe("API Integration", () => {
  it("should handle API errors", async () => {
    // Mock external API only
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));

    const { result } = renderHook(() => useDataFetch(), {
      wrapper: CoreTestProvider,
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
    });
  });
});
```

## Best Practices

1. **Naming**: Always prefix custom hooks with `use` (React convention)
2. **Single Responsibility**: Each hook should have one clear purpose
3. **Return Objects**: Return objects instead of arrays for better clarity
4. **Dependencies**: Always specify correct dependency arrays
5. **Memoization**: Use `useMemo`/`useCallback` for expensive operations
6. **Type Safety**: Add TypeScript types for parameters and return values
7. **Documentation**: Document complex hooks with JSDoc comments

## Migration Checklist

When refactoring existing components:

- [ ] Identify all stateful logic and side effects
- [ ] Create custom hook with descriptive name
- [ ] Move state, effects, and derived values to hook
- [ ] Define clear return interface from hook
- [ ] Update component to use hook
- [ ] Verify component is now pure UI
- [ ] Add tests for hook logic
- [ ] Update component tests to focus on UI
- [ ] Consider if hook should be shared

## Related Patterns

- **Headless UI**: Similar philosophy applied to generic UI components
- **Container/Presentational**: Older pattern this replaces in modern React
- **Render Props/HOCs**: Alternative patterns for logic reuse (less common now)
