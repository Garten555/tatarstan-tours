// Auto-generated Supabase Database Types
// This is a simplified version - you can generate the full types using:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

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
          email: string
          first_name: string
          last_name: string
          middle_name: string | null
          phone: string | null
          role: 'user' | 'tour_admin' | 'support_admin' | 'super_admin'
          avatar_url: string | null
          avatar_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          middle_name?: string | null
          phone?: string | null
          role?: 'user' | 'tour_admin' | 'support_admin' | 'super_admin'
          avatar_url?: string | null
          avatar_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          middle_name?: string | null
          phone?: string | null
          role?: 'user' | 'tour_admin' | 'support_admin' | 'super_admin'
          avatar_url?: string | null
          avatar_path?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tours: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          short_desc: string | null
          full_desc: string | null
          cover_image: string | null
          price_per_person: number
          start_date: string
          end_date: string
          max_participants: number
          current_bookings: number
          yandex_map_data: Json | null
          status: 'draft' | 'published' | 'archived'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description: string
          short_desc?: string | null
          full_desc?: string | null
          cover_image?: string | null
          price_per_person: number
          start_date: string
          end_date: string
          max_participants?: number
          current_bookings?: number
          yandex_map_data?: Json | null
          status?: 'draft' | 'published' | 'archived'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string
          short_desc?: string | null
          full_desc?: string | null
          cover_image?: string | null
          price_per_person?: number
          start_date?: string
          end_date?: string
          max_participants?: number
          current_bookings?: number
          yandex_map_data?: Json | null
          status?: 'draft' | 'published' | 'archived'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tour_media: {
        Row: {
          id: string
          tour_id: string
          media_type: 'image' | 'video'
          media_url: string
          thumbnail_url: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          tour_id: string
          media_type: 'image' | 'video'
          media_url: string
          thumbnail_url?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          tour_id?: string
          media_type?: 'image' | 'video'
          media_url?: string
          thumbnail_url?: string | null
          order_index?: number
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          tour_id: string
          booking_date: string
          num_people: number
          total_price: number
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          ticket_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tour_id: string
          booking_date?: string
          num_people: number
          total_price: number
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          ticket_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tour_id?: string
          booking_date?: string
          num_people?: number
          total_price?: number
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          ticket_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      booking_attendees: {
        Row: {
          id: string
          booking_id: string
          full_name: string
          email: string | null
          phone: string | null
          passport_data: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          passport_data?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          passport_data?: string | null
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string | null
          session_id: string
          message: string
          is_ai: boolean
          is_support: boolean
          support_admin_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id: string
          message: string
          is_ai?: boolean
          is_support?: boolean
          support_admin_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string
          message?: string
          is_ai?: boolean
          is_support?: boolean
          support_admin_id?: string | null
          created_at?: string
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
      user_role: 'user' | 'tour_admin' | 'support_admin' | 'super_admin'
      tour_status: 'draft' | 'published' | 'archived'
      media_type: 'image' | 'video'
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    }
  }
}

