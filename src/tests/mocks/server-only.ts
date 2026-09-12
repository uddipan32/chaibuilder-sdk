// Test mock for the Next.js `server-only` package.
//
// The real `server-only` module has no runtime API — it exists purely to make
// the bundler error if a Server-only module is pulled into a Client bundle, and
// it can't be resolved outside Next's build. App code and the chaibuilder-sdk
// server entrypoints `import "server-only"` at the top of server modules, so any
// vitest spec that transitively imports one fails to resolve it. This empty
// stand-in satisfies the import (a no-op) for tests only; the root
// `vitest.config.mts` aliases `server-only` here. Sibling of `only-server.ts`.
export {};
