'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/DashboardLayout'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function PaymentForm({ property }: { property: any }) {
  const stripe = useStripe()
  const elements = useElements()
  const supabase = createClient()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [amount, setAmount] = useState(property.monthly_rent.toString())
  const [saveCard, setSaveCard] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)
    setSuccess(false)

    try {
      if (!stripe || !elements) throw new Error('Stripe not loaded')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      // Create payment intent on backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: Math.round(parseFloat(amount) * 100), // Convert to cents
          propertyId: property.id,
          saveCard,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Payment failed')
      }

      const { clientSecret } = await response.json()

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error('Card element not found')

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      )

      if (stripeError) throw stripeError

      if (paymentIntent?.status === 'succeeded') {
        setSuccess(true)
        setAmount(property.monthly_rent.toString())
        cardElement.clear()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600">
        <h3 className="text-lg font-medium text-white">Payment Details</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400 text-xl">✓</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Payment Successful!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your rent payment has been processed successfully. You should receive a confirmation email shortly.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
              $
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
              step="0.01"
              min="0"
              required
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Monthly rent: ${property.monthly_rent}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    fontFamily: 'system-ui, sans-serif',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="saveCard"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="saveCard" className="ml-3 block text-sm text-gray-700">
            Save this card for future payments
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Payment Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay $${parseFloat(amount).toFixed(2)}`
          )}
        </button>
      </form>
    </div>
  )
}

export default function PayRent() {
  const supabase = createClient()
  
  const { data: tenantProperty, isLoading } = useQuery({
    queryKey: ['tenant-property'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tenant_properties')
        .select(`
          *,
          properties (
            id,
            title,
            address,
            monthly_rent
          )
        `)
        .eq('tenant_id', user.id)
        .eq('is_active', true)
        .single()

      if (error) throw error
      return data
    },
  })

  if (isLoading) {
    return (
      <DashboardLayout userType="tenant">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (!tenantProperty || !tenantProperty.properties) {
    return (
      <DashboardLayout userType="tenant">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  No Active Rental Property
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>No active rental property found. Please contact your landlord to set up your rental agreement.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const property = tenantProperty.properties

  return (
    <DashboardLayout userType="tenant">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pay Rent</h1>
          <p className="mt-2 text-gray-600">
            Make your monthly rent payment securely with your credit card.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Property Information */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Property Details</h2>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{property.title}</h3>
              <p className="text-gray-600 mb-4">{property.address}</p>
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-indigo-700">Monthly Rent</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    ${property.monthly_rent}
                  </span>
                </div>
              </div>
              
              {/* Quick payment buttons */}
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Quick Payment Options</p>
                <div className="grid grid-cols-3 gap-2">
                  <button className="text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors">
                    ${(property.monthly_rent * 0.5).toFixed(0)}
                  </button>
                  <button className="text-xs py-2 px-3 bg-indigo-100 hover:bg-indigo-200 rounded text-indigo-700 transition-colors">
                    ${property.monthly_rent}
                  </button>
                  <button className="text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors">
                    Custom
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <Elements stripe={stripePromise}>
            <PaymentForm property={property} />
          </Elements>
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">
                Your payment is secure
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                All payments are processed through Stripe with bank-level security. 
                Your card information is encrypted and never stored on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}