// Cloudflare Pages Function — read/write dashboard config from KV.
// Protected by Cloudflare Access (Zero Trust) on the site level — no additional
// auth needed here since only authenticated users can reach this endpoint.
//
// KV binding: add a KV namespace binding named CONFIG_KV in Pages project settings.

interface Env {
  CONFIG_KV: KVNamespace
}

const CONFIG_KEY = 'dashboard-config'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.CONFIG_KV) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }

  const value = await context.env.CONFIG_KV.get(CONFIG_KEY)
  return new Response(value ?? 'null', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!context.env.CONFIG_KV) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await context.request.text()

  try {
    JSON.parse(body)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  await context.env.CONFIG_KV.put(CONFIG_KEY, body)
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
}
