#!/usr/bin/env node
// Emits declarations in sequential groups instead of one all-entry pass.
//
// tsup runs dts through rollup-plugin-dts in a worker thread, and that worker holds
// the whole type graph for every entry simultaneously. At ~150 entries — pulling in
// payload, drizzle, radix and tiptap types — it exceeds the worker heap and dies with
// ERR_WORKER_OUT_OF_MEMORY on a 7GB CI runner. Splitting into groups bounds the graph
// per pass; the emitted .d.ts/.d.cts files are the same either way.
//
// Tune with CHAI_DTS_GROUPS. Higher = lower peak memory, more wall-clock (shared
// dependency types get re-parsed once per group). Skip entirely with TSUP_SKIP_DTS=true.

import { spawnSync } from "child_process";

if (process.env.TSUP_SKIP_DTS === "true") {
  console.log("TSUP_SKIP_DTS=true — skipping declaration build");
  process.exit(0);
}

// 8 keeps the heaviest slice (payload, payload/builder, payload/client — the admin UI,
// which drags in @payloadcms/ui, radix and tiptap types) at ~4.2GB peak RSS. Measured:
// at 4 groups that slice exceeds a 4GB heap; at 8 it fits under the 6GB cap below with
// room to spare on a 7GB CI runner.
const groups = Number(process.env.CHAI_DTS_GROUPS ?? 8);

for (let group = 0; group < groups; group++) {
  const label = `dts group ${group + 1}/${groups}`;
  console.log(`\n▶ ${label}`);

  const result = spawnSync("tsup", ["--format", "esm,cjs"], {
    stdio: "inherit",
    env: { ...process.env, CHAI_DTS_GROUPS: String(groups), CHAI_DTS_GROUP: String(group) },
  });

  if (result.error) {
    console.error(`✗ ${label} failed to start: ${result.error.message}`);
    process.exit(1);
  }
  // A heap-exhausted worker kills the process via signal rather than an exit code.
  if (result.signal) {
    console.error(`✗ ${label} terminated by ${result.signal} — try raising CHAI_DTS_GROUPS`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`✗ ${label} exited ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\n✓ Declarations emitted in ${groups} groups`);
