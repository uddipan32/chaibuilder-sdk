// Edition-owned (never synced): what `<pkg>/plugins/server` re-exports in the open-source
// edition. Core ships no server plugins today, so the barrel is intentionally empty; the
// shared `src/plugins/server.ts` shell forwards it either way so both editions keep the
// same file layout.
export {};
