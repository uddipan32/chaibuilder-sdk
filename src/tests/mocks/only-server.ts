// Test mock for the `~/server/only-server` runtime guard.
//
// The real guard throws when `typeof window !== "undefined"` to catch server
// internals leaking into a browser bundle. Vitest runs these integration specs
// under the happy-dom environment (window is defined) even though the code under
// test is server-side, so the guard would throw at import time. This no-op
// stand-in disables that browser check for tests only.
export {};
