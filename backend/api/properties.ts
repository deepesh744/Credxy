import { VercelRequest, VercelResponse } from '@vercel/node'
import { createServiceClient } from '../lib/supabase'
import { z } from 'zod'

const createPropertySchema = z.object({
  title: z.string().min(2),
  address: z.string().min(5),
  monthlyRent: z.number().positive(),
})

const assignTenantSchema = z.object({
  tenantEmail: z.string().email(),
  propertyId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string().optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
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

    // Verify user is a landlord for write operations
    if (req.method !== 'GET') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      if (profile?.user_type !== 'landlord') {
        return res.status(403).json({ error: 'Only landlords can manage properties' })
      }
    }

    switch (req.method) {
      case 'GET':
        // Get properties for landlord or tenant
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()

        if (userProfile?.user_type === 'landlord') {
          const { data: properties, error } = await supabase
            .from('properties')
            .select('*')
            .eq('landlord_id', user.id)
            .order('created_at', { ascending: false })

          if (error) throw error
          return res.status(200).json(properties)
        } else {
          // Tenant - get assigned properties
          const { data: tenantProperties, error } = await supabase
            .from('tenant_properties')
            .select(`
              *,
              properties (*)
            `)
            .eq('tenant_id', user.id)
            .eq('is_active', true)

          if (error) throw error
          return res.status(200).json(tenantProperties)
        }

      case 'POST':
        if (req.url?.includes('/assign-tenant')) {
          // Assign tenant to property
          const assignData = assignTenantSchema.parse(req.body)
          
          // Find tenant by email
          const { data: tenantUser, error: tenantError } = await supabase.auth.admin.listUsers()
          if (tenantError) throw tenantError

          const tenant = tenantUser.users.find(u => u.email === assignData.tenantEmail)
          if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' })
          }

          // Verify tenant profile exists and is a tenant
          const { data: tenantProfile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', tenant.id)
            .single()

          if (tenantProfile?.user_type !== 'tenant') {
            return res.status(400).json({ error: 'User is not a tenant' })
          }

          // Assign tenant to property
          const { data: assignment, error: assignError } = await supabase
            .from('tenant_properties')
            .insert({
              tenant_id: tenant.id,
              property_id: assignData.propertyId,
              start_date: assignData.startDate,
              end_date: assignData.endDate || null,
            })
            .select()
            .single()

          if (assignError) throw assignError
          return res.status(201).json(assignment)
        } else {
          // Create new property
          const propertyData = createPropertySchema.parse(req.body)
          
          const { data: property, error } = await supabase
            .from('properties')
            .insert({
              landlord_id: user.id,
              title: propertyData.title,
              address: propertyData.address,
              monthly_rent: propertyData.monthlyRent,
            })
            .select()
            .single()

          if (error) throw error
          return res.status(201).json(property)
        }

      case 'PUT':
        // Update property
        const propertyId = req.query.id as string
        const updateData = createPropertySchema.partial().parse(req.body)
        
        const { data: updatedProperty, error: updateError } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', propertyId)
          .eq('landlord_id', user.id)
          .select()
          .single()

        if (updateError) throw updateError
        return res.status(200).json(updatedProperty)

      case 'DELETE':
        // Delete property
        const deletePropertyId = req.query.id as string
        
        const { error: deleteError } = await supabase
          .from('properties')
          .delete()
          .eq('id', deletePropertyId)
          .eq('landlord_id', user.id)

        if (deleteError) throw deleteError
        return res.status(204).end()

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Properties API error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      })
    }
    
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}