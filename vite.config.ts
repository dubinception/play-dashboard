import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
  })
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-api-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy', async (req: IncomingMessage, res: ServerResponse) => {
          try {
            const qs = req.url?.split('?')[1] ?? ''
            const params = new URLSearchParams(qs)
            const rawUrl = params.get('url')
            if (!rawUrl) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing url param' }))
              return
            }
            const target = decodeURIComponent(rawUrl)
            const headers: Record<string, string> = {
              'User-Agent': 'play-dashboard/1.0',
              'Accept': 'application/json',
            }
            const clientId     = req.headers['x-cf-client-id']
            const clientSecret = req.headers['x-cf-client-secret']
            const apiKey       = req.headers['x-api-key']
            const authorization  = req.headers['x-authorization']
            const requestedWith  = req.headers['x-requested-with']
            if (clientId)       headers['CF-Access-Client-Id']     = String(clientId)
            if (clientSecret)   headers['CF-Access-Client-Secret'] = String(clientSecret)
            if (apiKey)         headers['X-Api-Key']               = String(apiKey)
            if (authorization)  headers['Authorization']           = String(authorization)
            if (requestedWith)  headers['X-Requested-With']        = String(requestedWith)

            const isPost = req.method === 'POST'
            if (isPost) headers['Content-Type'] = 'application/json'

            const body = isPost ? await readBody(req) : undefined
            const response = await fetch(target, {
              method: isPost ? 'POST' : 'GET',
              headers,
              body,
            })
            const text = await response.text()
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(text)
          } catch (e) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: String(e) }))
          }
        })
      },
    },
  ],
  resolve: {
    alias: { '@': '/src' },
  },
})
