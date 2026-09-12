'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Loader } from 'lucide-react'
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { getLogoutHandler } from '~/builder/logout-handler'
import { connectToIframe, disconnectFromIframe, requestIframeClose } from '~/lib/iframe-comms/parent'
import type { CmsActionEvent } from '~/lib/iframe-comms/types'
import { handleCmsAction } from './cms-action-handler'

interface ChaiIFrameWindowProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  src?: string
  className?: string
  hidden?: boolean
  /** Buffer CMS invalidations until this iframe unmounts (e.g. edit modal close). */
  deferInvalidation?: boolean
}

export type ChaiIFrameWindowHandle = {
  requestClose: () => Promise<boolean>
}

export const ChaiIFrameWindow = forwardRef<ChaiIFrameWindowHandle, ChaiIFrameWindowProps>(function ChaiIFrameWindow(
  { src = '/admin', className = '', hidden = false, deferInvalidation = false, ...iframeProps },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pendingEventsRef = useRef<CmsActionEvent[]>([])
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(true)

  const handleLoad = useCallback(() => setIsLoading(false), [])

  useImperativeHandle(
    ref,
    () => ({
      requestClose: async () => {
        const iframe = iframeRef.current
        if (!iframe) {
          return true
        }
        return requestIframeClose(iframe)
      },
    }),
    [],
  )

  useEffect(() => {
    setIsLoading(true)
  }, [src])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const setOverlayVisible = (visible: boolean) => {
      console.log('[ChaiIFrameWindow] setOverlayVisible called:', visible)
    }

    connectToIframe(iframe, setOverlayVisible, {
      onAction: (event) => {
        if (deferInvalidation) {
          pendingEventsRef.current.push(event)
          return
        }
        handleCmsAction(queryClient, [event])
      },
      onNavigate: (_path) => {
        // Handle navigation if needed
      },
      onLogout: () => {
        // CMS hit its login screen — the session cookie is shared, so this
        // window is signed out too. Host handler does the redirect.
        getLogoutHandler()?.('cms-logout')
      },
      config: { debug: true },
    })

    return () => {
      if (deferInvalidation && pendingEventsRef.current.length > 0) {
        handleCmsAction(queryClient, pendingEventsRef.current)
        pendingEventsRef.current = []
      }
      disconnectFromIframe(iframe)
    }
  }, [queryClient, deferInvalidation])

  return (
    <div className={`chai-iframe-container ${className} ${hidden ? 'hidden' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface text-[13px] text-gray-500">
          <Loader className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}
      <iframe
        {...iframeProps}
        ref={iframeRef}
        src={src}
        sandbox={iframeProps.sandbox ?? 'allow-same-origin allow-scripts allow-forms'}
        onLoad={handleLoad}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block', ...iframeProps.style }}
      />
    </div>
  )
})
