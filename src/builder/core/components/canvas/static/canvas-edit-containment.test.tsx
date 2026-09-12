// @vitest-environment happy-dom
/**
 * Ungated regression guard for the edit-containment guarantee (PR #3760): a
 * prop-only edit to one canvas block must re-render ONLY that block, not the
 * whole canvas. The RUN_RENDER_BENCH bench measures the ms; this asserts the
 * invariant in normal CI so a reintroduced page-wide subscription (the class of
 * bug fixed in useAddBlock / usePartialGraph / useCheckStructure) turns a test
 * red instead of silently regressing typing latency.
 *
 * A small tree is enough — the property under test is "one edit → ~one block
 * re-renders", independent of size.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { builderStore } from "~/builder/atoms/store";
import { registerChaiBlock } from "~/registry";
import type { ChaiBlock } from "~/types/common";
import { PageBlocksRenderer } from "./new-blocks-renderer";

let renders = 0;
const Passthrough = (props: any) => {
  renders++;
  return <div data-content={props.content}>{props.children}</div>;
};
registerChaiBlock(Passthrough as any, { type: "ContainBox", label: "ContainBox", group: "bench" });
registerChaiBlock(Passthrough as any, { type: "ContainLeaf", label: "ContainLeaf", group: "bench" });

// The canvas hooks read/write the module-global builderStore (useAtomCallback
// pins that store), so the test must seed it — a fresh createStore() renders
// nothing. The dnd chain reaches useQuery (partial graph), so a QueryClient is
// required; `enabled: false` keeps it from touching the network.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

const tree = (): ChaiBlock[] =>
  [
    { _id: "root", _type: "ContainBox", content: "root" },
    { _id: "a", _type: "ContainBox", _parent: "root", content: "a" },
    { _id: "b", _type: "ContainLeaf", _parent: "a", content: "b-original" },
    { _id: "c", _type: "ContainLeaf", _parent: "a", content: "c" },
    { _id: "d", _type: "ContainLeaf", _parent: "root", content: "d" },
  ] as ChaiBlock[];

afterEach(() => {
  renders = 0;
  // Reset the shared default store so seeded blocks never leak into another
  // test that reads presentBlocksAtom on the same store (this file's tests run
  // in one fork; vitest isolates across files but not within one).
  act(() => {
    builderStore.set(presentBlocksAtom, []);
  });
});

describe("canvas edit containment", () => {
  it("re-renders only the edited block on a prop-only edit", () => {
    const blocks = tree();
    act(() => {
      builderStore.set(presentBlocksAtom, blocks);
    });
    const { container, unmount } = render(
      <QueryClientProvider client={queryClient}>
        <Provider store={builderStore}>
          <PageBlocksRenderer />
        </Provider>
      </QueryClientProvider>,
    );
    expect(container.querySelectorAll("[data-content]").length).toBe(blocks.length);

    // Prop-only edit: new array, same structure — only block "b"'s content changes.
    const edited = blocks.map((blk) => (blk._id === "b" ? { ...blk, content: "b-edited" } : blk));
    renders = 0;
    act(() => {
      builderStore.set(presentBlocksAtom, edited);
    });

    // The edit must reach the DOM (no stale canvas) ...
    expect(container.querySelectorAll('[data-content="b-edited"]').length).toBe(1);
    expect(container.querySelectorAll('[data-content="b-original"]').length).toBe(0);
    // ... while re-rendering only the edited block, not the whole tree. A small
    // constant tolerance (not `=== 1`) absorbs React/jotai bookkeeping without
    // admitting a page-wide (O(n) = 5) re-render.
    expect(renders).toBeLessThanOrEqual(2);
    unmount();
  });
});
