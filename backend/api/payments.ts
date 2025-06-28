import { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createServiceClient } from '../lib/supabase'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const createPaymentIntentSchema = z.object({
  amount: z.number().positive(),
  propertyId: z.string().uuid(),
  saveCard: z.boolean().optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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

    const body = createPaymentIntentSchema.parse(req.body)

    // Verify tenant has access to property
    const { data: tenantProperty } = await supabase
      .from('tenant_properties')
      .select('id')
      .eq('tenant_id', user.id)
      .eq('property_id', body.propertyId)
      .eq('is_active', true)
      .single()

    if (!tenantProperty) {
      return res.status(403).json({ error: 'Access denied to this property' })
    }

    // Get or create Stripe customer
    let stripeCustomerId: string

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      stripeCustomerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount,
      currency: 'cad',
      customer: stripeCustomerId,
      setup_future_usage: body.saveCard ? 'off_session' : undefined,
      metadata: {
        tenant_id: user.id,
        property_id: body.propertyId,
      },
    })

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      })
    }
    
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    })
  }
}