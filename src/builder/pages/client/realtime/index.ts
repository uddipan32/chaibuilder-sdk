/**
 * The core half of the realtime feature: shared lock state plus the seam the
 * `chai:realtime` plugin plugs its transport into. Core UI (topbar, page manager,
 * publish sheet, query sync) reads from here and stays correct whether or not the
 * plugin is installed.
 */
export {
  PAGE_STATUS,
  pageLockMetaAtom,
  pageStatusAtom,
  pageUserMapAtom,
  useCurrentPageOwner,
  usePageId,
  usePageLockMeta,
  usePageLockStatus,
  usePageToUser,
  useUserId,
  type ChaiOnlineUser,
  type ChaiPageStatus,
} from "./chai-realtime-state";
export {
  enableChaiRealtime,
  isChaiRealtimeEnabled,
  resetChaiRealtimeForTests,
  useRegisterChaiRealtimeSender,
  useSendRealtimeEvent,
  type ChaiRealtimeSender,
} from "./chai-realtime-transport";
