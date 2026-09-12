import { AsyncLocalStorage } from "async_hooks";
import type { ChaiDebugLevel } from "~/types/chaibuilder-config";

let _globalDebugLevel: ChaiDebugLevel = 0;
const requestDebugStorage = new AsyncLocalStorage<ChaiDebugLevel>();

export function setGlobalDebugLevel(level: ChaiDebugLevel): void {
  _globalDebugLevel = level;
}

export function getGlobalDebugLevel(): ChaiDebugLevel {
  return _globalDebugLevel;
}

export function runWithDebugLevel<T>(level: ChaiDebugLevel, fn: () => T): T {
  return requestDebugStorage.run(level, fn);
}

export function getDebugLevel(): ChaiDebugLevel {
  return requestDebugStorage.getStore() ?? _globalDebugLevel;
}

export function shouldDebug(minLevel: ChaiDebugLevel): boolean {
  return getDebugLevel() >= minLevel;
}
