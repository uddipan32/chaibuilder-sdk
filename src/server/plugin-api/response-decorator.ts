/**
 * Process-global action-response decorators. Plugins contribute extra
 * top-level fields to every HTTP action response envelope. Keyed by name so
 * per-route module graphs
 * replace instead of duplicate; a failing decorator is skipped — decoration
 * must never break an action response.
 */
export type ChaiResponseDecorator = () => Promise<Record<string, unknown> | null>;

const _g = globalThis as typeof globalThis & {
  __chaiResponseDecorators?: Map<string, ChaiResponseDecorator>;
};

function getRegistry(): Map<string, ChaiResponseDecorator> {
  if (!_g.__chaiResponseDecorators) {
    _g.__chaiResponseDecorators = new Map();
  }
  return _g.__chaiResponseDecorators;
}

export function registerChaiResponseDecorator(name: string, decorator: ChaiResponseDecorator): void {
  getRegistry().set(name, decorator);
}

export async function runChaiResponseDecorators(): Promise<Record<string, unknown>> {
  let extras: Record<string, unknown> = {};
  for (const [name, decorator] of getRegistry()) {
    try {
      const result = await decorator();
      if (result) {
        extras = { ...extras, ...result };
      }
    } catch (error) {
      console.error(`ChaiBuilder: response decorator "${name}" failed:`, error);
    }
  }
  return extras;
}

/** @internal Clears registered decorators between unit tests. */
export function resetChaiResponseDecoratorsForTests(): void {
  _g.__chaiResponseDecorators = undefined;
}
