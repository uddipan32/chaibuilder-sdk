import { atom, useAtom } from "jotai";
import { useMemo } from "react";
import { usePrimaryPage } from "~/builder/pages/hooks/pages/use-current-page";
import { useChaiAuth } from "~/builder/pages/hooks/use-chai-auth";
import { isChaiRealtimeEnabled } from "./chai-realtime-transport";

/** One client's presence entry: which page it has open, and since when. */
export type ChaiOnlineUser = {
  pageId: string;
  userId: string;
  clientId: string;
  onlineAt: number;
};

export const PAGE_STATUS = {
  LOCKED: "LOCKED",
  EDITING: "EDITING",
  CHECKING: "CHECKING",
  TAKE_OVER_REQUESTED: "TAKE_OVER_REQUESTED",
  ACTIVE_IN_ANOTHER_TAB: "ACTIVE_IN_ANOTHER_TAB",
  FORCE_TAKE_OVER: "FORCE_TAKE_OVER",
  CONNECTION_LOST: "CONNECTION_LOST",
} as const;

export type ChaiPageStatus = (typeof PAGE_STATUS)[keyof typeof PAGE_STATUS];

/** pageId -> the client that owns the edit lock on it. Written by the realtime plugin. */
export const pageUserMapAtom = atom<Record<string, ChaiOnlineUser>>({});
export const pageStatusAtom = atom<ChaiPageStatus>(PAGE_STATUS.CHECKING);
export const pageLockMetaAtom = atom<any>({});

/** Statuses in which the page must not accept edits from this client. */
const LOCKED_STATUSES: ChaiPageStatus[] = [
  PAGE_STATUS.LOCKED,
  PAGE_STATUS.ACTIVE_IN_ANOTHER_TAB,
  PAGE_STATUS.CHECKING,
];

/**
 * @returns
 * { pageId: { pageId: string; userId: string; clientId: string; onlineAt: number }}
 */
export const usePageToUser = () => {
  const [pageToUser, setPageToUser] = useAtom(pageUserMapAtom);
  return { pageToUser, setPageToUser };
};

/**
 * The current page's lock state. Without the realtime plugin nobody else can be
 * holding the page, so this reports a plain editing session — never CHECKING, which
 * would otherwise leave the editor blurred behind a loader forever.
 */
export const usePageLockStatus = () => {
  const [trackedStatus, setPageStatus] = useAtom(pageStatusAtom);
  const pageStatus: ChaiPageStatus = isChaiRealtimeEnabled() ? trackedStatus : PAGE_STATUS.EDITING;
  const isLocked = LOCKED_STATUSES.includes(pageStatus);
  const isEditing = pageStatus === PAGE_STATUS.EDITING;
  return { pageStatus, setPageStatus, isLocked, isEditing };
};

export const usePageLockMeta = () => {
  const [pageLockMeta, setPageLockMeta] = useAtom(pageLockMetaAtom);
  return { pageLockMeta, setPageLockMeta };
};

/**
 * @returns
 * null | { pageId: string; userId: string; clientId: string; onlineAt: number }
 */
export const useCurrentPageOwner = () => {
  const pageId = usePageId();
  const { pageToUser } = usePageToUser();
  return useMemo(() => pageToUser[pageId], [pageToUser, pageId]);
};

export const useUserId = () => {
  const { user: chaiUser } = useChaiAuth();
  return chaiUser?.id;
};

export const usePageId = () => {
  const { data: currentPage } = usePrimaryPage();
  return currentPage?.id;
};
