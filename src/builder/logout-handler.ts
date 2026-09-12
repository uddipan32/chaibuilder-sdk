/**
 * Module-level holder for the host logout handler. Set by the
 * {@link ChaiWebsiteBuilder} wrapper from its `onLogout` prop and read by the
 * sidebar logout panel — the panel is registered globally (not via props), so a
 * plain holder is the simplest way to hand it the host callback. Mirrors
 * the topbar-icon holder in ~/payload/builder.
 */
type LogoutHandler = (reason?: string) => void

let logoutHandler: LogoutHandler | null = null

export function setLogoutHandler(handler: LogoutHandler | undefined): void {
  logoutHandler = handler ?? null
}

export function getLogoutHandler(): LogoutHandler | null {
  return logoutHandler
}
