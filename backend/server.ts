import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import paymentsHandler from './api/payments'
import webhookHandler from './api/webhook'
import { VercelRequest, VercelResponse } from '@vercel/node'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Convert Express req/res to Vercel format
const expressToVercel = (handler: any) => {
  return async (req: express.Request, res: express.Response) => {
    const vercelReq = {
      ...req,
      query: req.query,
      cookies: req.cookies || {},
      body: req.body,
    } as unknown as VercelRequest

    const vercelRes = {
      status: (code: number) => {
        res.status(code)
        return vercelRes
      },
      json: (data: any) => {
        res.json(data)
        return vercelRes
      },
      send: (data: any) => {
        res.send(data)
        return vercelRes
      },
      end: () => {
        res.end()
        return vercelRes
      },
      setHeader: (key: string, value: string) => {
        res.setHeader(key, value)
        return vercelRes
      },
    } as unknown as VercelResponse

    await handler(vercelReq, vercelRes)
  }
}

// Routes
app.post('/api/payments', expressToVercel(paymentsHandler))
app.post('/api/webhook', express.raw({ type: 'application/json' }), expressToVercel(webhookHandler))
app.options('/api/payments', expressToVercel(paymentsHandler)) // Handle CORS preflight

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
})