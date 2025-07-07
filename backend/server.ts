import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import paymentsHandler from './api/payments'
import webhookHandler from './api/webhook'
import propertiesHandler from './api/properties'
import usersHandler from './api/users'
import stripeHandler from './api/stripe'
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
      url: req.url,
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
app.options('/api/payments', expressToVercel(paymentsHandler))

app.post('/api/webhook', express.raw({ type: 'application/json' }), expressToVercel(webhookHandler))

app.get('/api/properties', expressToVercel(propertiesHandler))
app.post('/api/properties', expressToVercel(propertiesHandler))
app.put('/api/properties/:id', expressToVercel(propertiesHandler))
app.delete('/api/properties/:id', expressToVercel(propertiesHandler))
app.post('/api/properties/assign-tenant', expressToVercel(propertiesHandler))
app.options('/api/properties', expressToVercel(propertiesHandler))

app.get('/api/users', expressToVercel(usersHandler))
app.put('/api/users', expressToVercel(usersHandler))
app.options('/api/users', expressToVercel(usersHandler))

app.get('/api/stripe/payment-methods', expressToVercel(stripeHandler))
app.get('/api/stripe/payment-history', expressToVercel(stripeHandler))
app.post('/api/stripe/setup-intent', expressToVercel(stripeHandler))
app.delete('/api/stripe/payment-methods/:id', expressToVercel(stripeHandler))
app.options('/api/stripe/*', expressToVercel(stripeHandler))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Rent Payment API',
    version: '1.0.0',
    endpoints: [
      'POST /api/payments',
      'POST /api/webhook',
      'GET /api/properties',
      'POST /api/properties',
      'PUT /api/properties/:id',
      'DELETE /api/properties/:id',
      'GET /api/users',
      'PUT /api/users',
      'GET /api/stripe/payment-methods',
      'GET /api/stripe/payment-history'
    ]
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
})