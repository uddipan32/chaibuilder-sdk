// @vitest-environment happy-dom
// Environment control for the canvas bench: plain React tree of the same
// shape, no canvas machinery. Separates happy-dom/React-commit cost from
// canvas assembly cost.
import { act, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

let bump: (() => void) | null = null;
const Leaf = ({ i }: { i: number }) => {
  const [txt, setTxt] = useState(`content ${i}`);
  if (i === 1) bump = () => setTxt("edited");
  return <div>{txt}</div>;
};
const Tree = ({ n }: { n: number }) => (
  <div>
    {Array.from({ length: Math.ceil(n / 100) }, (_, g) => (
      <div key={g}>
        {Array.from({ length: Math.min(100, n - g * 100) }, (_, i) => (
          <Leaf key={i} i={g * 100 + i} />
        ))}
      </div>
    ))}
  </div>
);
const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

describe.skipIf(!process.env.RUN_RENDER_BENCH)("env control", () => {
  it("plain react tree", () => {
    for (const [n, iters] of [[500, 7], [2000, 7], [4000, 5], [8000, 3]] as const) {
      const mounts: number[] = [];
      const edits: number[] = [];
      let divs = 0;
      for (let i = 0; i < iters; i++) {
        const t0 = performance.now();
        const { container, unmount } = render(<Tree n={n} />);
        mounts.push(performance.now() - t0);
        divs = container.querySelectorAll("div").length;
        const t1 = performance.now();
        act(() => bump && bump());
        edits.push(performance.now() - t1);
        unmount();
      }
      console.log(`BENCH control n=${n} mount=${median(mounts).toFixed(1)}ms textEdit=${median(edits).toFixed(2)}ms divs=${divs}`);
      expect(divs).toBeGreaterThan(n);
    }
  }, 600_000);
});
