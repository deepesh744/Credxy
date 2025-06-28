import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900">
            Rent Payment App
          </h1>
          <p className="mt-2 text-gray-600">
            Pay your rent securely with credit card
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/signup"
            className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="block w-full bg-white text-indigo-600 border border-indigo-600 py-3 px-4 rounded-md hover:bg-indigo-50 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}