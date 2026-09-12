export type ChaiFrameworkAdapter = {
  persistentCache: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyParts: string[],
    opts?: { revalidate?: number | false; tags?: string[] },
  ) => (...args: Parameters<T>) => ReturnType<T>;
  invalidatePath: (path: string, type?: "layout" | "page") => void | Promise<void>;
  invalidateTag: (tag: string, profile?: unknown) => void | Promise<void>;
  runAfterResponse: (fn: () => void | Promise<unknown>) => void;
  pageNotFound: () => never;
  /** Must throw. `permanent` selects a permanent (301-class) over a temporary (302-class) redirect. */
  redirect: (path: string, permanent?: boolean) => never;
};

const noopAdapter: ChaiFrameworkAdapter = {
  persistentCache: ((fn) => fn) as ChaiFrameworkAdapter["persistentCache"],
  invalidatePath: () => {},
  invalidateTag: () => {},
  runAfterResponse: (fn) => {
    void Promise.resolve(fn()).catch(console.error);
  },
  pageNotFound: () => {
    throw new Error("Page not found");
  },
  redirect: (path) => {
    throw new Error(`REDIRECT:${path}`);
  },
};

let _adapter: ChaiFrameworkAdapter = noopAdapter;

export const setFrameworkAdapter = (adapter: Partial<ChaiFrameworkAdapter>) => {
  _adapter = { ...noopAdapter, ...adapter };
};

export const resetFrameworkAdapterForTests = () => {
  _adapter = noopAdapter;
};

export const getFrameworkAdapter = () => _adapter;
