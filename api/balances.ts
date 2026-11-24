import { balancesResponse } from '../src/server/simplefin.ts'

interface NodeRequest {
  method?: string
  headers: { authorization?: string | string[] }
}

interface NodeResponse {
  status(code: number): { json(body: unknown): void }
}

/** Vercel serverless function. Holds the SimpleFIN access URL and returns balances only. */
export default async function handler(req: NodeRequest, res: NodeResponse) {
  const header = req.headers.authorization
  const result = await balancesResponse({
    method: req.method ?? 'GET',
    authorization: Array.isArray(header) ? header[0] : header,
    accessUrl: process.env.SIMPLEFIN_ACCESS_URL,
    syncSecret: process.env.SYNC_SECRET,
  })
  res.status(result.status).json(result.body)
}
