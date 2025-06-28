import { createMocks } from 'node-mocks-http'
import handler from '../../api/payments'

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

describe('/api/payments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if no authorization header', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(401)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' })
  })

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' })
  })

  it('should handle OPTIONS requests for CORS', async () => {
    const { req, res } = createMocks({
      method: 'OPTIONS',
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(res._getHeaders()['access-control-allow-origin']).toBe('*')
  })
})