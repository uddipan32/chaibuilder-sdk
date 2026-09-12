import { atom, useAtomValue, useSetAtom } from "jotai";

export const pagesPropsAtom = atom<any>({});

/**
 * Config resolved by the server and delivered over GET_WEBSITE_DATA. Null until it lands, which
 * the builder gates rendering on, so no read site ever observes the pre-merge state.
 */
export type ChaiServerConfig = {
  features: Record<string, unknown>;
  ai: Record<string, unknown>;
  mediaManager: Record<string, unknown>;
};

export const serverConfigAtom = atom<ChaiServerConfig | null>(null);

/**
 * `flags`, `ai` and `mediaManager` are server-owned: they overwrite rather than merge with the pages
 * props, so the server config is the only thing that can answer what the builder shows.
 */
const mergedPagesPropsAtom = atom((get) => {
  const props = get(pagesPropsAtom);
  const serverConfig = get(serverConfigAtom);
  if (!serverConfig) return props;
  return {
    ...props,
    flags: serverConfig.features,
    ai: serverConfig.ai,
    mediaManager: serverConfig.mediaManager,
  };
});

export const usePagesProps = () => [useAtomValue(mergedPagesPropsAtom), useSetAtom(pagesPropsAtom)] as const;
