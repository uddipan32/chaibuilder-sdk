#!/usr/bin/env node
// List the sync commits in this repo, newest first, from the trailers sync-src.mjs writes.
//
//   pnpm sync:log            table: commit, date, direction, source
//   pnpm sync:log --json     same data as JSON
//   pnpm sync:log --limit=5
import { git, parseArgs, repoRoot } from "./sync-lib.mjs";

const args = parseArgs(process.argv.slice(2));
const root = repoRoot(process.cwd());
const limit = Number(args.limit ?? 50);

// Unit/record separators keep multi-line trailer values apart without ambiguity.
const FIELD = "\u001f";
const RECORD = "\u001e";
const format = [
  "%H",
  "%h",
  "%ad",
  "%s",
  "%(trailers:key=Sync-Direction,valueonly)",
  "%(trailers:key=Sync-Source,valueonly)",
  "%(trailers:key=Sync-Previous,valueonly)",
].join("%x1f");
const raw = git(root, "log", `-${limit}`, "--grep=^Sync-Source: ", "--date=short", `--format=${format}%x1e`);

const entries = raw
  .split(RECORD)
  .map((record) => record.trim())
  .filter(Boolean)
  .map((record) => {
    const [sha, short, date, subject, direction, source, previous] = record.split(FIELD).map((v) => v.trim());
    return { sha, short, date, subject, direction, source, previous: previous || null };
  });

if (args.json) {
  console.log(JSON.stringify(entries, null, 2));
  process.exit(0);
}
if (entries.length === 0) {
  console.log("No sync commits found (none carry a Sync-Source trailer).");
  process.exit(0);
}
for (const e of entries) {
  const was = e.previous ? `  (was ${e.previous.split("@")[1]?.slice(0, 7)})` : "";
  console.log(`${e.short}  ${e.date}  ${e.direction.padEnd(11)}  ${e.source}${was}`);
}
