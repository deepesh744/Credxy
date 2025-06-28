export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_type: 'tenant' | 'landlord'
          full_name: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_type: 'tenant' | 'landlord'
          full_name?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_type?: 'tenant' | 'landlord'
          full_name?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          landlord_id: string
          title: string
          address: string
          monthly_rent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          landlord_id: string
          title: string
          address: string
          monthly_rent: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          landlord_id?: string
          title?: string
          address?: string
          monthly_rent?: number
          created_at?: string
          updated_at?: string
        }
      }
      tenant_properties: {
        Row: {
          id: string
          tenant_id: string
          property_id: string
          start_date: string
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          start_date: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          tenant_id: string
          property_id: string
          amount: number
          stripe_payment_intent_id: string | null
          status: string
          payment_method_last4: string | null
          payment_date: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          amount: number
          stripe_payment_intent_id?: string | null
          status: string
          payment_method_last4?: string | null
          payment_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          amount?: number
          stripe_payment_intent_id?: string | null
          status?: string
          payment_method_last4?: string | null
          payment_date?: string
          created_at?: string
        }
      }
    }
  }
}