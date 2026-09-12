#!/usr/bin/env node
// Copy the shared `src/` tree from a sibling checkout of the other edition into this repo.
//
//   pnpm sync:src --from=../pro --dry-run   preview adds / updates / deletes; writes nothing
//   pnpm sync:src --from=../pro             apply, write .sync-ref, create the sync commit
//   pnpm sync:src --from=../pro --no-commit apply and stage, but leave the commit to you
//
// Paths listed in src-sync.exclude are never copied and never deleted (pro-only plugins,
// src/payload, and each repo's own src/edition). Every other file under src/ ends up
// byte-identical to the sibling. The sync commit records what it carried in its body and in
// git trailers (Sync-Source, Sync-Direction, …) so `pnpm sync:log` can find it later. See SYNC.md.
import fs from "node:fs";
import path from "node:path";
import {
  assertSameManifest,
  diffSharedTrees,
  fail,
  git,
  manifestHash,
  parseArgs,
  repoRoot,
  repoShortName,
  repoSlug,
  tryGit,
  wrap,
} from "./sync-lib.mjs";

const MAX_LISTED_FILES = 40;
const MAX_LISTED_COMMITS = 30;
const SYNC_REF_FILE = ".sync-ref";

const args = parseArgs(process.argv.slice(2));
if (!args.from || args.from === true) {
  fail("usage: sync-src.mjs --from=<path-to-sibling-checkout> [--dry-run] [--no-commit]");
}

const here = repoRoot(process.cwd());
const sibling = repoRoot(path.resolve(process.cwd(), args.from));
if (sibling === here) fail("--from must point at the other edition's checkout, not this repo");

const manifest = assertSameManifest(here, sibling);
const hereSlug = repoSlug(here);
const siblingSlug = repoSlug(sibling);
const siblingSha = git(sibling, "rev-parse", "HEAD");
const siblingBranch = tryGit(sibling, "rev-parse", "--abbrev-ref", "HEAD") ?? "detached";
const siblingDirty = (tryGit(sibling, "status", "--porcelain", "--", "src") ?? "").length > 0;

const previous = readSyncRef(here);
const sourceCommits = listSourceCommits(sibling, previous, siblingSlug);
const plan = diffSharedTrees(sibling, here, manifest);
const total = plan.add.length + plan.update.length + plan.delete.length;

printPreview();

if (total === 0) {
  console.log(`src/ is already in sync with ${siblingSlug}@${short(siblingSha)}. Nothing to do.`);
  process.exit(0);
}

if (args["dry-run"]) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}

if (siblingDirty) {
  fail(`${sibling} has uncommitted changes under src/. Commit or stash them so .sync-ref points at real history.`);
}
const dirty = tryGit(here, "status", "--porcelain", "--", "src", SYNC_REF_FILE) ?? "";
if (dirty)
  fail(`this repo has uncommitted changes under src/ or ${SYNC_REF_FILE}. Commit or stash them first.\n${dirty}`);

apply();
fs.writeFileSync(path.join(here, SYNC_REF_FILE), `${siblingSlug}@${siblingSha}\n`);
git(here, "add", "-A", "--", "src", SYNC_REF_FILE);

const message = buildCommitMessage();
const messageFile = path.join(here, ".git", "SYNC_COMMIT_MSG");
fs.writeFileSync(messageFile, message);
if (args["no-commit"]) {
  console.log(
    `Staged. Review with \`git diff --cached\`, then commit with:\n  git commit -F ${path.relative(here, messageFile)}`,
  );
  process.exit(0);
}

// --no-verify: the content was validated in the source repo and CI validates the pull request;
// running the pre-commit hook's prettier/eslint/vitest over a large sync adds minutes for nothing.
git(here, "commit", "--no-verify", "-F", messageFile);
fs.rmSync(messageFile, { force: true });
console.log(`Committed: ${git(here, "log", "-1", "--format=%h %s")}`);

// ---------------------------------------------------------------------------

function short(sha) {
  return sha.slice(0, 7);
}

function readSyncRef(root) {
  const file = path.join(root, SYNC_REF_FILE);
  if (!fs.existsSync(file)) return null;
  const match = fs
    .readFileSync(file, "utf8")
    .trim()
    .match(/^(.+)@([0-9a-f]{7,40})$/);
  return match ? { slug: match[1], sha: match[2] } : null;
}

function listSourceCommits(root, prev, slug) {
  if (!prev || prev.slug !== slug) return { known: false, lines: [] };
  if (tryGit(root, "cat-file", "-e", `${prev.sha}^{commit}`) === null) return { known: false, lines: [] };
  const log = tryGit(root, "log", "--format=%h %s", `${prev.sha}..HEAD`, "--", "src") ?? "";
  return { known: true, lines: log ? log.split("\n") : [] };
}

function printPreview() {
  console.log(`Sync src/: ${siblingSlug} (${siblingBranch}, ${short(siblingSha)}) -> ${hereSlug}`);
  if (previous) console.log(`Last sync recorded in ${SYNC_REF_FILE}: ${previous.slug}@${short(previous.sha)}`);
  if (sourceCommits.known) {
    console.log(`Source commits touching src/ since then: ${sourceCommits.lines.length}`);
    for (const line of sourceCommits.lines.slice(0, MAX_LISTED_COMMITS)) console.log(`  ${line}`);
    const rest = sourceCommits.lines.length - MAX_LISTED_COMMITS;
    if (rest > 0) console.log(`  (+${rest} more)`);
  } else if (previous) {
    console.log("Source commits since then: unknown (recorded commit is not in the sibling's history)");
  }
  console.log("");
  const section = (label, list, mark) => {
    if (list.length === 0) return;
    console.log(`${label} (${list.length}):`);
    for (const rel of list) console.log(`  ${mark} src/${rel}`);
  };
  section("Add", plan.add, "+");
  section("Update", plan.update, "~");
  section("Delete", plan.delete, "-");
  console.log(
    `\n${plan.identical} identical, ${plan.add.length} to add, ${plan.update.length} to update, ${plan.delete.length} to delete`,
  );
  if (plan.delete.length > 0) {
    console.log(
      "\n!! Deletions remove files that exist only in this repo. If any of them is meant to stay, add its\n" +
        "   path to src-sync.exclude (in both repos) before syncing.",
    );
  }
  console.log("");
}

function apply() {
  for (const rel of [...plan.add, ...plan.update]) {
    const target = path.join(here, "src", rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(plan.source.get(rel), target);
  }
  const srcRoot = path.join(here, "src");
  for (const rel of plan.delete) {
    const target = path.join(srcRoot, rel);
    fs.rmSync(target, { force: true });
    pruneEmptyDirs(path.dirname(target), srcRoot);
  }
}

function pruneEmptyDirs(dir, stopAt) {
  while (dir.startsWith(stopAt) && dir !== stopAt) {
    if (fs.readdirSync(dir).length > 0) return;
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

function buildCommitMessage() {
  const fromName = repoShortName(siblingSlug);
  const toName = repoShortName(hereSlug);
  const lines = [];
  lines.push(`chore(sync): ${fromName}@${short(siblingSha)}`);
  lines.push("");
  lines.push(...wrap(`Sync src/ from ${siblingSlug} (${siblingBranch}) into ${hereSlug}.`));
  lines.push("");
  if (sourceCommits.known) {
    const since = previous ? ` (${SYNC_REF_FILE} was ${fromName}@${short(previous.sha)})` : "";
    lines.push(`Source commits since last sync${since}:`);
    if (sourceCommits.lines.length === 0) lines.push("  (none touching src/)");
    for (const line of sourceCommits.lines.slice(0, MAX_LISTED_COMMITS)) lines.push(`  ${truncate(line, 94)}`);
    const rest = sourceCommits.lines.length - MAX_LISTED_COMMITS;
    if (rest > 0) lines.push(`  (+${rest} more)`);
  } else if (previous) {
    lines.push("Source commits since last sync: unknown (previous ref not in source history).");
  } else {
    lines.push("First recorded sync from this source.");
  }
  lines.push(`Files: ${plan.update.length} updated, ${plan.add.length} added, ${plan.delete.length} deleted`);
  const listed = [
    ...plan.add.map((rel) => `  + src/${rel}`),
    ...plan.update.map((rel) => `  ~ src/${rel}`),
    ...plan.delete.map((rel) => `  - src/${rel}`),
  ];
  for (const line of listed.slice(0, MAX_LISTED_FILES)) lines.push(truncate(line, 96));
  if (listed.length > MAX_LISTED_FILES) lines.push(`  (+${listed.length - MAX_LISTED_FILES} more, see the diff)`);
  lines.push("");
  lines.push(`Sync-Direction: ${fromName}->${toName}`);
  lines.push(`Sync-Source: ${siblingSlug}@${siblingSha}`);
  if (previous) lines.push(`Sync-Previous: ${previous.slug}@${previous.sha}`);
  lines.push(`Sync-Manifest: ${manifestHash(manifest)}`);
  return `${lines.join("\n")}\n`;
}

function truncate(line, width) {
  return line.length <= width ? line : `${line.slice(0, width - 1)}…`;
}
