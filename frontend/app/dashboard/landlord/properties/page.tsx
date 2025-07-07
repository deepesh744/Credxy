'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import DashboardLayout from '@/components/DashboardLayout'

const propertySchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  monthlyRent: z.number().positive('Monthly rent must be positive'),
})

type PropertyData = z.infer<typeof propertySchema>

interface Property {
  id: string
  title: string
  address: string
  monthly_rent: number
  created_at: string
}

export default function Properties() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Property[]
    },
  })

  const createProperty = useMutation({
    mutationFn: async (property: PropertyData) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('properties')
        .insert({
          landlord_id: user.id,
          title: property.title,
          address: property.address,
          monthly_rent: property.monthlyRent,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setShowForm(false)
      reset()
    },
  })

  const updateProperty = useMutation({
    mutationFn: async ({ id, ...property }: PropertyData & { id: string }) => {
      const { data, error } = await supabase
        .from('properties')
        .update({
          title: property.title,
          address: property.address,
          monthly_rent: property.monthlyRent,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      setEditingProperty(null)
      reset()
    },
  })

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyData>({
    resolver: zodResolver(propertySchema),
    defaultValues: editingProperty ? {
      title: editingProperty.title,
      address: editingProperty.address,
      monthlyRent: editingProperty.monthly_rent,
    } : undefined,
  })

  const onSubmit = (data: PropertyData) => {
    if (editingProperty) {
      updateProperty.mutate({ ...data, id: editingProperty.id })
    } else {
      createProperty.mutate(data)
    }
  }

  const handleEdit = (property: Property) => {
    setEditingProperty(property)
    reset({
      title: property.title,
      address: property.address,
      monthlyRent: property.monthly_rent,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProperty(null)
    reset()
  }

  return (
    <DashboardLayout userType="landlord">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
            <p className="mt-2 text-gray-600">
              Manage your rental properties and track tenant assignments.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <span className="mr-2">+</span>
            Add Property
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🏢</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Properties
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {properties?.length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Monthly Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${properties?.reduce((sum, p) => sum + p.monthly_rent, 0).toLocaleString() || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Avg. Rent
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${properties?.length ? Math.round(properties.reduce((sum, p) => sum + p.monthly_rent, 0) / properties.length).toLocaleString() : 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Property Form */}
        {showForm && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Title
                  </label>
                  <input
                    {...register('title')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Downtown Apartment, Suburban House"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    {...register('address')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="123 Main St, Toronto, ON M5V 3A1"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent (CAD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      {...register('monthlyRent', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="pl-8 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="2000.00"
                    />
                  </div>
                  {errors.monthlyRent && (
                    <p className="mt-1 text-sm text-red-600">{errors.monthlyRent.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingProperty ? 'Update Property' : 'Create Property'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Properties List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading properties...</p>
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {properties.map((property) => (
                <li key={property.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-medium text-indigo-600 truncate">
                            {property.title}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              ${property.monthly_rent}/month
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="mr-2">📍</span>
                          <p className="truncate">{property.address}</p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="mr-2">📅</span>
                          <p>Added on {new Date(property.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="ml-6 flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(property)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this property?')) {
                              deleteProperty.mutate(property.id)
                            }
                          }}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
            <p className="text-gray-500 mb-6">Add your first property to get started managing your rentals.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
            >
              Add Your First Property
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}