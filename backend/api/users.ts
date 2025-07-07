import { VercelRequest, VercelResponse } from '@vercel/node'
import { createServiceClient } from '../lib/supabase'
import { z } from 'zod'

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  userType: z.enum(['tenant', 'landlord']).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
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

    switch (req.method) {
      case 'GET':
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        
        return res.status(200).json({
          id: user.id,
          email: user.email,
          ...profile,
        })

      case 'PUT':
        // Update user profile
        const updateData = updateProfileSchema.parse(req.body)
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: updateData.fullName,
            user_type: updateData.userType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single()

        if (updateError) throw updateError
        
        return res.status(200).json({
          id: user.id,
          email: user.email,
          ...updatedProfile,
        })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Users API error:', error)
    
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