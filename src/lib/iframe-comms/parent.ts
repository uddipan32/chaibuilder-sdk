/**
 * Parent-side iframe communication
 * Used by the host page (/admin/editor) to communicate with the child iframe (/admin)
 */

import { connect, Connection, RemoteProxy, WindowMessenger } from 'penpal'
import {
  ChildMethods,
  CmsActionEvent,
  ConnectionConfig,
  ConnectionState,
  ParentMethods,
} from './types'

/** Connection instance and state tracker */
interface ParentConnection {
  connection: Connection<ChildMethods>
  child: RemoteProxy<ChildMethods> | null
  state: ConnectionState
}

/** Active connections by iframe element */
const connections = new WeakMap<HTMLIFrameElement, ParentConnection>()

/** Default connection options */
const defaultConfig: Required<ConnectionConfig> = {
  timeout: 30000,
  debug: false,
}

/** Log debug messages when debug mode is enabled */
function logDebug(message: string, config: ConnectionConfig): void {
  if (config.debug) {
    console.log(`[Parent IFrame] ${message}`)
  }
}

/** Create parent-side methods that child can call */
function createParentMethods(
  setOverlayVisible: (visible: boolean) => void,
  onNavigate?: (path: string) => void,
  onAction?: (event: CmsActionEvent) => void,
  onLogout?: () => void,
  config: ConnectionConfig = {},
): ParentMethods {
  return {
    onCmsReady: () => {
      logDebug('CMS ready signal received', config)
    },

    hideCmsOverlay: () => {
      logDebug('Hiding CMS overlay', config)
      setOverlayVisible(false)
    },

    onCmsNavigate: (path: string) => {
      logDebug(`CMS navigated to: ${path}`, config)
      onNavigate?.(path)
    },

    onCmsAction: (event: CmsActionEvent) => {
      logDebug(`CMS action: ${event.type} ${event.collection}`, config)
      onAction?.(event)
    },

    onCmsLogout: () => {
      logDebug('CMS session ended', config)
      onLogout?.()
    },
  }
}

/** Get current connection state for an iframe */
export function getConnectionState(iframe: HTMLIFrameElement): ConnectionState {
  return connections.get(iframe)?.state ?? 'disconnected'
}

/** Check if iframe has an active connection */
export function isConnected(iframe: HTMLIFrameElement): boolean {
  const conn = connections.get(iframe)
  return conn?.state === 'connected' && conn?.child !== null
}

/** Get child methods proxy if connected */
export function getChildMethods(iframe: HTMLIFrameElement): RemoteProxy<ChildMethods> | null {
  return connections.get(iframe)?.child ?? null
}

/**
 * Connect to child iframe
 * Call this when the iframe is mounted and ready
 */
export function connectToIframe(
  iframe: HTMLIFrameElement,
  setOverlayVisible: (visible: boolean) => void,
  options: {
    onNavigate?: (path: string) => void
    onAction?: (event: CmsActionEvent) => void
    onLogout?: () => void
    config?: ConnectionConfig
  } = {},
): Connection<ChildMethods> {
  const config = { ...defaultConfig, ...options.config }

  logDebug('Starting connection...', config)

  const parentMethods = createParentMethods(
    setOverlayVisible,
    options.onNavigate,
    options.onAction,
    options.onLogout,
    config,
  )

  const messenger = new WindowMessenger({
    remoteWindow: iframe.contentWindow!,
  })

  const connection = connect<ChildMethods>({
    messenger,
    methods: parentMethods,
    timeout: config.timeout,
  })

  const connData: ParentConnection = {
    connection,
    child: null,
    state: 'connecting',
  }

  connections.set(iframe, connData)

  connection.promise
    .then((child: RemoteProxy<ChildMethods>) => {
      logDebug('Connected successfully', config)
      connData.child = child
      connData.state = 'connected'
    })
    .catch((error: unknown) => {
      console.error('[Parent IFrame] Connection failed:', error)
      connData.state = 'error'
    })

  return connection
}

/**
 * Ask the child iframe whether the parent may close (e.g. edit modal).
 * Returns true when close is allowed; false when user chooses to stay.
 */
export async function requestIframeClose(iframe: HTMLIFrameElement): Promise<boolean> {
  const conn = connections.get(iframe)

  if (!conn || conn.state !== 'connected' || !conn.child) {
    return true
  }

  try {
    return await conn.child.requestClose()
  } catch (error: unknown) {
    console.error('[Parent IFrame] Failed to request close from child:', error)
    return true
  }
}

export async function sendChildToUrl(iframe: HTMLIFrameElement, url: string): Promise<void> {
  const conn = connections.get(iframe)

  if (!conn || conn.state !== 'connected' || !conn.child) {
    console.error('[Parent IFrame] Cannot send to URL: not connected')
    return
  }

  try {
    await conn.child.gotoUrl(url)
  } catch (error: unknown) {
    console.error('[Parent IFrame] Failed to send child to URL:', error)
  }
}

/**
 * Disconnect from iframe and cleanup
 * Call this when the iframe is unmounted or overlay is hidden
 */
export function disconnectFromIframe(iframe: HTMLIFrameElement): void {
  const conn = connections.get(iframe)

  if (conn) {
    conn.connection.destroy()
    connections.delete(iframe)
  }
}
