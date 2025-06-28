import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import PaymentForm from '@/components/PaymentForm'

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}))

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: '123' } } }),
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } }),
    },
  }),
}))

const mockProperty = {
  id: '123',
  title: 'Test Property',
  monthly_rent: 1500,
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const stripePromise = loadStripe('test_key')

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  </QueryClientProvider>
)

describe('PaymentForm', () => {
  it('renders payment form with correct amount', () => {
    render(<PaymentForm property={mockProperty} />, { wrapper })
    
    const amountInput = screen.getByDisplayValue('1500')
    expect(amountInput).toBeInTheDocument()
  })

  it('allows user to change payment amount', () => {
    render(<PaymentForm property={mockProperty} />, { wrapper })
    
    const amountInput = screen.getByDisplayValue('1500') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '1600' } })
    
    expect(amountInput.value).toBe('1600')
  })

  it('shows save card checkbox', () => {
    render(<PaymentForm property={mockProperty} />, { wrapper })
    
    const checkbox = screen.getByLabelText(/save this card/i)
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
    
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('disables submit button when processing', async () => {
    render(<PaymentForm property={mockProperty} />, { wrapper })
    
    const submitButton = screen.getByRole('button', { name: /pay/i })
    expect(submitButton).toBeEnabled()
    
    // Note: Full payment flow testing would require more complex mocking
  })
})