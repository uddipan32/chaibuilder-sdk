/**
 * IFrame Communication Module
 * Bidirectional messaging between /admin/editor (parent) and /admin (child iframe)
 *
 * Uses Penpal for promise-based, type-safe iframe communication.
 *
 * @example
 * // Parent usage (in TopLeft.tsx):
 * import { connectToIframe, disconnectFromIframe } from '~/lib/iframe-comms/parent'
 *
 * // Child usage (in /admin layout):
 * import { connectToParentWindow } from '~/lib/iframe-comms/child'
 */

export type {
  ChildMethods,
  CmsActionEvent,
  CmsActionType,
  ConnectionConfig,
  ConnectionState,
  ParentMethods,
} from './types'

export {
  connectToIframe,
  disconnectFromIframe,
  getChildMethods,
  getConnectionState as getParentConnectionState,
  isConnected as isParentConnected,
  requestIframeClose,
  sendChildToUrl,
} from './parent'

export {
  connectToParentWindow,
  disconnectFromParent,
  emitCmsAction,
  getConnectionState as getChildConnectionState,
  getParentMethods,
  isConnected as isChildConnected,
  notifyReady,
  registerCloseGuard,
  requestHideOverlay,
  updatePath,
} from './child'
