#!/usr/bin/env node
// Report drift between this repo's shared `src/` tree and a sibling checkout of the other edition.
//
//   pnpm sync:check --sibling=../pro
//
// Exit 0 when every non-excluded file under src/ is byte-identical in both repos and the root
// files that shape src/ (see ALSO_IDENTICAL in sync-lib.mjs) match too; exit 1 with a listing
// otherwise. Paths in src-sync.exclude are skipped. See SYNC.md.
import path from "node:path";
import {
  assertSameManifest,
  diffAlsoIdentical,
  diffSharedTrees,
  fail,
  parseArgs,
  repoRoot,
  repoSlug,
} from "./sync-lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.sibling || args.sibling === true) fail("usage: sync-check.mjs --sibling=<path-to-sibling-checkout>");

const here = repoRoot(process.cwd());
const sibling = repoRoot(path.resolve(process.cwd(), args.sibling));
if (sibling === here) fail("--sibling must point at the other edition's checkout, not this repo");

const manifest = assertSameManifest(here, sibling);
const tree = diffSharedTrees(sibling, here, manifest);
const roots = diffAlsoIdentical(here, sibling);

const hereName = repoSlug(here);
const siblingName = repoSlug(sibling);
let drift = 0;

const section = (label, list, render) => {
  if (list.length === 0) return;
  drift += list.length;
  console.log(`${label} (${list.length}):`);
  for (const item of list) console.log(`  ${render(item)}`);
};
section(`Only in ${siblingName}`, tree.add, (rel) => `src/${rel}`);
section(`Only in ${hereName}`, tree.delete, (rel) => `src/${rel}`);
section("Differs", tree.update, (rel) => `src/${rel}`);
section("Root files that must match", roots, ({ rel, reason }) => `${rel} (${reason})`);

if (drift > 0) {
  console.log(
    `\n✖ ${drift} path(s) drift between ${hereName} and ${siblingName} (${tree.identical} shared files identical).`,
  );
  console.log(
    "  Sync with `pnpm sync:src --from=<sibling>`, or add by-design differences to src-sync.exclude in both repos.",
  );
  process.exit(1);
}
console.log(`✓ src/ in sync with ${siblingName}: ${tree.identical} shared files identical, root files match.`);
