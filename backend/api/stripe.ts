import { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createServiceClient } from '../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Verify authentication
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const supabase = createServiceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' })
    }

    switch (req.method) {
      case 'GET':
        if (req.url?.includes('/payment-methods')) {
          // Get saved payment methods
          const paymentMethods = await stripe.paymentMethods.list({
            customer: profile.stripe_customer_id,
            type: 'card',
          })

          return res.status(200).json({
            paymentMethods: paymentMethods.data.map(pm => ({
              id: pm.id,
              brand: pm.card?.brand,
              last4: pm.card?.last4,
              expMonth: pm.card?.exp_month,
              expYear: pm.card?.exp_year,
            })),
          })
        } else if (req.url?.includes('/payment-history')) {
          // Get payment history
          const { data: payments, error } = await supabase
            .from('payments')
            .select(`
              *,
              properties (title, address)
            `)
            .eq('tenant_id', user.id)
            .order('payment_date', { ascending: false })
            .limit(50)

          if (error) throw error
          return res.status(200).json(payments)
        }
        break

      case 'POST':
        if (req.url?.includes('/setup-intent')) {
          // Create setup intent for saving cards
          const setupIntent = await stripe.setupIntents.create({
            customer: profile.stripe_customer_id,
            payment_method_types: ['card'],
            usage: 'off_session',
          })

          return res.status(200).json({
            clientSecret: setupIntent.client_secret,
          })
        }
        break

      case 'DELETE':
        if (req.url?.includes('/payment-methods/')) {
          // Delete saved payment method
          const paymentMethodId = req.url.split('/').pop()
          
          if (!paymentMethodId) {
            return res.status(400).json({ error: 'Payment method ID required' })
          }

          await stripe.paymentMethods.detach(paymentMethodId)
          return res.status(204).end()
        }
        break

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }

    return res.status(404).json({ error: 'Endpoint not found' })
  } catch (error) {
    console.error('Stripe API error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}