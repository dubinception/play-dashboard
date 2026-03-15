// Cloudflare Pages Function — server-side proxy to bypass CORS for self-hosted services.
// Supports GET and POST. Usage: /api/proxy?url=<encodeURIComponent(full_service_api_url)>
//
// Cloudflare Access: pass X-CF-Client-Id / X-CF-Client-Secret from the browser
// (set in Settings → Cloudflare Access) and they are forwarded to the target.
//
// Security: set PROXY_ALLOWLIST in Cloudflare Pages env vars as comma-separated base URLs.
// If unset, any URL is proxied (open install default).

interface Env {
  PROXY_ALLOWLIST?: string
}

async function handle(context: EventContext<Env, string, unknown>): Promise<Response> {
  const { searchParams } = new URL(context.request.url)
  const rawUrl = searchParams.get('url')

  if (!rawUrl) {
    return new Response(JSON.stringify({ error: 'Missing url param' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const target = decodeURIComponent(rawUrl)

  const allowlist = context.env.PROXY_ALLOWLIST
    ?.split(',').map((s) => s.trim()).filter(Boolean)

  if (allowlist?.length) {
    const allowed = allowlist.some((prefix) => target.startsWith(prefix))
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'URL not in allowlist' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const headers: Record<string, string> = {
    'User-Agent': 'play-dashboard/1.0',
    'Accept': 'application/json',
  }
  const clientId      = context.request.headers.get('X-CF-Client-Id')
  const clientSecret  = context.request.headers.get('X-CF-Client-Secret')
  const apiKey        = context.request.headers.get('X-Api-Key')
  const authorization  = context.request.headers.get('X-Authorization')
  const requestedWith  = context.request.headers.get('X-Requested-With')
  if (clientId)       headers['CF-Access-Client-Id']     = clientId
  if (clientSecret)   headers['CF-Access-Client-Secret'] = clientSecret
  if (apiKey)         headers['X-Api-Key']               = apiKey
  if (authorization)  headers['Authorization']           = authorization
  if (requestedWith)  headers['X-Requested-With']        = requestedWith

  const method = context.request.method
  const hasBody = method === 'POST' || method === 'PUT'
  if (hasBody) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(target, {
      method,
      headers,
      body: hasBody ? context.request.body : undefined,
    })
    const contentType = response.headers.get('Content-Type') ?? 'application/json'
    const isImage = contentType.startsWith('image/')
    if (isImage) {
      const buffer = await response.arrayBuffer()
      return new Response(buffer, {
        status: response.status,
        headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
      })
    }
    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': contentType.includes('json') ? 'application/json' : contentType },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const onRequestGet:    PagesFunction<Env> = handle
export const onRequestPost:   PagesFunction<Env> = handle
export const onRequestPut:    PagesFunction<Env> = handle
export const onRequestDelete: PagesFunction<Env> = handle
