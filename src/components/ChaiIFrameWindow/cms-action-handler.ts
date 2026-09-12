import type { QueryClient } from '@tanstack/react-query'
import type { CmsActionEvent } from '~/lib/iframe-comms/types'

export function handleCmsAction(
  queryClient: QueryClient,
  events: CmsActionEvent[],
): void {
  if (events.length === 0) return

  console.log('handleCmsAction', events);
  
  const keysToInvalidate = new Set<string>()

  for (const event of events) {
    if (event.actionType === 'invalidate' && event.keys?.length) {
      for (const key of event.keys) {
        keysToInvalidate.add(key)
      }
    }
    if ((event.type === 'create' || event.type === 'update') && event.data) {
      const slug = (event.data as Record<string, any>).slug
      if (slug) {
        setUrlSlug(slug)
      }
    }
  }
  if (keysToInvalidate.size > 0) {
    for (const key of keysToInvalidate) {
      queryClient.invalidateQueries({ queryKey: [key], refetchType: 'all' })
    }
  }
}


function setUrlSlug(slug: string): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('slug', slug)
  window.history.replaceState({}, '', url.toString())
}
