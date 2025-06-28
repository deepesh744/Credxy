import { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createServiceClient } from '../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await getRawBody(req)
  const sig = req.headers['stripe-signature'] as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Record payment in database
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            tenant_id: paymentIntent.metadata.tenant_id,
            property_id: paymentIntent.metadata.property_id,
            amount: paymentIntent.amount / 100, // Convert from cents
            stripe_payment_intent_id: paymentIntent.id,
            status: 'completed',
            payment_method_last4: (paymentIntent as any).charges?.data[0]?.payment_method_details?.card?.last4,
          })

        if (paymentError) {
          console.error('Failed to record payment:', paymentError)
          return res.status(500).json({ error: 'Failed to record payment' })
        }

        // TODO: Send email notifications
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        
        await supabase
          .from('payments')
          .insert({
            tenant_id: failedPayment.metadata.tenant_id,
            property_id: failedPayment.metadata.property_id,
            amount: failedPayment.amount / 100,
            stripe_payment_intent_id: failedPayment.id,
            status: 'failed',
          })
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}