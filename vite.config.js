import { Readable } from 'node:stream'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vercel serves api/ in production. This runs the same file during local development.
const localApi = () => ({
  name: 'local-api',
  configureServer(server) {
    Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/visitors')) return next()
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const route = await server.ssrLoadModule('/api/visitors.js')
      const handler = route[req.method]
      if (!handler) {
        res.writeHead(405).end()
        return
      }
      const reply = await handler(new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method, headers: req.headers, body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
      }))
      res.writeHead(reply.status, Object.fromEntries(reply.headers))
      if (reply.body) Readable.fromWeb(reply.body).pipe(res)
      else res.end()
    })
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2600 },
})
