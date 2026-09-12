/**
 * Types for iframe communication between parent (/admin/editor) and child (/admin)
 * Uses Penpal for type-safe async iframe messaging
 */

/** Penpal Methods type constraint */
export type Methods = {
  [key: string]: Methods | ((...args: any[]) => any)
}

export type CmsActionType = 'create' | 'update' | 'delete'

export interface CmsActionEvent {
  actionType : "set_data" | "invalidate"
  type: CmsActionType,
  collection: string
  documentId?: string
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  timestamp: string
  data?: Record<string, unknown>
  keys?: string[]
}

/** Methods exposed by the parent (host page at /admin/editor) */
export interface ParentMethods extends Methods {
  /** Notify parent that CMS loaded */
  onCmsReady: () => void
  /** Request parent to hide CMS overlay */
  hideCmsOverlay: () => void
  /** Notify parent of navigation within CMS */
  onCmsNavigate: (path: string) => void
  /** Notify parent of CMS content action */
  onCmsAction: (event: CmsActionEvent) => void
  /** Notify parent that the CMS session ended (logout / expired session) */
  onCmsLogout: () => void
}

/** Methods exposed by the child (iframe content at /admin) */
export interface ChildMethods extends Methods {
  /** Get current CMS route/path */
  getCurrentPath: () => string
  /** Navigate to a specific CMS route */
  navigateTo: (path: string) => void
  /** Navigate to a URL within the CMS */
  gotoUrl: (url: string) => void
  /** Refresh CMS data */
  refresh: () => void
  /** Ask child whether parent may close the embed (shows Payload leave-without-saving when dirty). */
  requestClose: () => Promise<boolean>
}

/** Connection state for tracking iframe communication status */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

/** Configuration options for iframe connection */
export interface ConnectionConfig {
  /** Timeout for connection attempt in ms (default: 30000) */
  timeout?: number
  /** Enable debug logging */
  debug?: boolean
}
