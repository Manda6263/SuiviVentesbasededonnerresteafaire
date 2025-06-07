import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on the schema
export type Database = {
  public: {
    Tables: {
      sales: {
        Row: {
          id: string
          created_at: string
          date: string
          client_name: string
          product_name: string
          quantity: number
          unit_price: number
          total_amount: number
          payment_method: string
          notes: string | null
          seller: string | null
          register: string | null
          category: string | null
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          date: string
          client_name: string
          product_name: string
          quantity: number
          unit_price: number
          total_amount: number
          payment_method: string
          notes?: string | null
          seller?: string | null
          register?: string | null
          category?: string | null
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          date?: string
          client_name?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          total_amount?: number
          payment_method?: string
          notes?: string | null
          seller?: string | null
          register?: string | null
          category?: string | null
          user_id?: string
        }
      }
      stock_items: {
        Row: {
          id: string
          created_at: string
          name: string
          category: string
          subcategory: string
          current_stock: number
          alert_threshold: number
          initial_stock: number
          unit_price: number
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          category: string
          subcategory?: string
          current_stock?: number
          alert_threshold?: number
          initial_stock?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          category?: string
          subcategory?: string
          current_stock?: number
          alert_threshold?: number
          initial_stock?: number
          unit_price?: number
          user_id?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          created_at: string
          date: string
          product_id: string
          type: 'in' | 'out'
          quantity: number
          reason: string
          register: string | null
          seller: string | null
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          date?: string
          product_id: string
          type: 'in' | 'out'
          quantity: number
          reason: string
          register?: string | null
          seller?: string | null
          user_id: string
        }
        Update: {
          id?: string
          created_at?: string
          date?: string
          product_id?: string
          type?: 'in' | 'out'
          quantity?: number
          reason?: string
          register?: string | null
          seller?: string | null
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      stock_movement_type: 'in' | 'out'
    }
  }
}

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  
  if (error?.message) {
    // Common error messages
    if (error.message.includes('JWT')) {
      return 'Session expired. Please log in again.'
    }
    if (error.message.includes('Row Level Security')) {
      return 'Access denied. You can only access your own data.'
    }
    if (error.message.includes('duplicate key')) {
      return 'This item already exists.'
    }
    if (error.message.includes('foreign key')) {
      return 'Cannot delete this item as it is referenced by other data.'
    }
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting current user:', error)
    return null
  }
  return user
}

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const user = await getCurrentUser()
  return !!user
}