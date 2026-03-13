// Routes all service API calls through /api/proxy server-side,
// automatically injecting Cloudflare Access service token headers if configured.
// Pass extraHeaders to forward additional headers to the target service
// (e.g. X-Api-Key for services that require header-based auth).

import useConfigStore from '@/store/useConfigStore'

function cfHeaders(): Record<string, string> {
  const { cloudflare } = useConfigStore.getState()
  const headers: Record<string, string> = {}
  if (cloudflare.cfClientId)     headers['X-CF-Client-Id']     = cloudflare.cfClientId
  if (cloudflare.cfClientSecret) headers['X-CF-Client-Secret'] = cloudflare.cfClientSecret
  return headers
}

export async function proxyFetch(targetUrl: string, extraHeaders?: Record<string, string>): Promise<Response> {
  return fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, {
    headers: { ...cfHeaders(), ...extraHeaders },
  })
}

export async function proxyPost(targetUrl: string, body: unknown, extraHeaders?: Record<string, string>): Promise<Response> {
  return fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, {
    method: 'POST',
    headers: { ...cfHeaders(), 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  })
}
