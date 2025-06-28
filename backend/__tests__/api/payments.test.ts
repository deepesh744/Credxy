import handler from '../../api/payments'
import { VercelRequest, VercelResponse } from '@vercel/node'

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  })),
}))

jest.mock('stripe', () => {
  return jest.fn(() => ({
    customers: {
      create: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
    },
  }))
})

// Helper to create mock request/response
function createMockReqRes(options: {
  method: string
  headers?: Record<string, string>
  body?: any
}) {
  const req = {
    method: options.method,
    headers: options.headers || {},
    body: options.body || {},
    query: {},
    cookies: {},
  } as unknown as VercelRequest

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    _getStatusCode: function() { 
      const statusCall = (this.status as jest.Mock).mock.calls[0]
      return statusCall ? statusCall[0] : 200 
    },
    _getData: function() { 
      const jsonCall = (this.json as jest.Mock).mock.calls[0]
      return jsonCall ? JSON.stringify(jsonCall[0]) : '' 
    },
    _getHeaders: function() {
      const headers: Record<string, string> = {}
      const calls = (this.setHeader as jest.Mock).mock.calls
      calls.forEach(([key, value]) => {
        headers[key.toLowerCase()] = value
      })
      return headers
    }
  } as unknown as VercelResponse & {
    _getStatusCode: () => number
    _getData: () => string
    _getHeaders: () => Record<string, string>
  }

  return { req, res }
}

describe('/api/payments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if no authorization header', async () => {
    const { req, res } = createMockReqRes({ method: 'POST' })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' })
  })

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  it('should handle OPTIONS requests for CORS', async () => {
    const { req, res } = createMockReqRes({ method: 'OPTIONS' })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(res._getHeaders()['access-control-allow-origin']).toBe('*')
  })
})