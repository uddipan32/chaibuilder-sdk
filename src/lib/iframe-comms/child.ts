/**
 * Child-side iframe communication
 * Used by the iframe content (/admin) to communicate with the parent (/admin/editor)
 */

import { connect, Connection, RemoteProxy, WindowMessenger } from 'penpal'
import {
  ChildMethods,
  CmsActionEvent,
  ConnectionConfig,
  ConnectionState,
  ParentMethods,
} from './types'

/** Global connection state */
let connection: Connection<ParentMethods> | null = null
let parent: RemoteProxy<ParentMethods> | null = null
let state: ConnectionState = 'disconnected'
let currentPath = '/admin'

type CloseGuardFn = () => Promise<boolean>
let closeGuard: CloseGuardFn | null = null

/** Set when logout is reported before the handshake completes; flushed on connect. */
let logoutPending = false

/** Register handler invoked when parent requests to close the embed iframe. */
export function registerCloseGuard(fn: CloseGuardFn | null): void {
  closeGuard = fn
}

/** Default connection options */
const defaultConfig: Required<ConnectionConfig> = {
  timeout: 30000,
  debug: false,
}

/** Log debug messages when debug mode is enabled */
function logDebug(message: string, config: ConnectionConfig): void {
  if (config.debug) {
    console.log(`[Child IFrame] ${message}`)
  }
}

/** Get current connection state */
export function getConnectionState(): ConnectionState {
  return state
}

/** Check if connected to parent */
export function isConnected(): boolean {
  return state === 'connected' && parent !== null
}

/** Get parent methods proxy if connected */
export function getParentMethods(): RemoteProxy<ParentMethods> | null {
  return parent
}

/** Create child-side methods that parent can call */
function createChildMethods(config: ConnectionConfig = {}): ChildMethods {
  return {
    getCurrentPath: () => {
      logDebug(`Returning current path: ${currentPath}`, config)
      return currentPath
    },

    navigateTo: (path: string) => {
      logDebug(`Navigating to: ${path}`, config)
      if (typeof window !== 'undefined') {
        window.location.href = path
      }
    },

    gotoUrl: (url: string) => {
      logDebug(`Going to URL: ${url}`, config)
      if (typeof window !== 'undefined') {
        window.location.href = url
        updatePath(url)
      }
    },

    refresh: () => {
      logDebug('Refreshing page', config)
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    },

    requestClose: async () => {
      if (!closeGuard) {
        return true
      }
      return closeGuard()
    },
  }
}

/** Update tracked path and notify parent of navigation */
export function updatePath(path: string): void {
  currentPath = path

  if (parent && state === 'connected') {
    parent.onCmsNavigate(path).catch((err: unknown) => {
      console.error('[Child IFrame] Failed to notify parent of navigation:', err)
    })
  }
}

/** Notify parent that CMS is ready */
export function notifyReady(): void {
  if (parent && state === 'connected') {
    parent.onCmsReady().catch((err: unknown) => {
      console.error('[Child IFrame] Failed to notify parent:', err)
    })
  }
}

/** Request parent to hide the overlay */
export function requestHideOverlay(): void {
  if (parent && state === 'connected') {
    parent.hideCmsOverlay().catch((err: unknown) => {
      console.error('[Child IFrame] Failed to request hide overlay:', err)
    })
  }
}

function sendLogout(parentProxy: RemoteProxy<ParentMethods>): void {
  parentProxy.onCmsLogout().catch((err: unknown) => {
    console.error('[Child IFrame] Failed to notify parent of logout:', err)
  })
}

/**
 * Tell the parent the CMS session ended so it can log out too.
 *
 * Called from the login view: reaching it inside the embed means the shared
 * Payload cookie is gone, so the parent editor's session is dead as well.
 * The login view mounts before the bridge provider's effect runs, so a signal
 * sent pre-handshake is buffered and flushed once connected.
 */
export function notifyLogout(): void {
  if (typeof window === 'undefined' || window.parent === window) return

  if (parent && state === 'connected') {
    sendLogout(parent)
    return
  }

  logoutPending = true
}

export function emitCmsAction(event: CmsActionEvent): void {
  if (parent && state === 'connected') {
    parent.onCmsAction(event).catch((err: unknown) => {
      console.error('[Child IFrame] Failed to send CMS action:', err)
    })
  }
}

/**
 * Connect to parent window
 * Call this once when the admin page loads
 */
export function connectToParentWindow(config: ConnectionConfig = {}): void {
  if (typeof window === 'undefined') return

  const mergedConfig = { ...defaultConfig, ...config }

  logDebug('Starting connection to parent...', mergedConfig)

  state = 'connecting'

  const childMethods = createChildMethods(mergedConfig)

  const messenger = new WindowMessenger({
    remoteWindow: window.parent,
  })

  connection = connect<ParentMethods>({
    messenger,
    methods: childMethods,
    timeout: mergedConfig.timeout,
  })

  connection.promise
    .then((parentProxy: RemoteProxy<ParentMethods>) => {
      logDebug('Connected to parent', mergedConfig)
      parent = parentProxy
      state = 'connected'

      // Notify parent we're ready
      parentProxy.onCmsReady().catch((err: unknown) => {
        console.error('[Child IFrame] Failed to send ready signal:', err)
      })

      // Update current path
      updatePath(window.location.pathname + window.location.search)

      if (logoutPending) {
        logoutPending = false
        sendLogout(parentProxy)
      }
    })
    .catch((error: unknown) => {
      console.error('[Child IFrame] Connection failed:', error)
      state = 'error'
    })
}

/** Disconnect from parent and cleanup */
export function disconnectFromParent(): void {
  if (connection) {
    connection.destroy()
  }
  connection = null
  parent = null
  state = 'disconnected'
}
