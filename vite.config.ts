/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import { balancesResponse } from './src/server/simplefin.ts'

/** Same /api/balances endpoint locally that Vercel serves from api/balances.ts. */
function balancesApi(): Plugin {
  const handle = (mode: string): Connect.NextHandleFunction => async (req, res) => {
    const env = loadEnv(mode, process.cwd(), '')
    const result = await balancesResponse({
      method: req.method ?? 'GET',
      authorization: req.headers.authorization,
      accessUrl: env.SIMPLEFIN_ACCESS_URL,
      syncSecret: env.SYNC_SECRET,
    })
    res.statusCode = result.status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result.body))
  }
  return {
    name: 'balances-api',
    configureServer(server) {
      server.middlewares.use('/api/balances', handle(server.config.mode))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/balances', handle(server.config.mode))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), balancesApi()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
