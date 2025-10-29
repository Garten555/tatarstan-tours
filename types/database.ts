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
          cover_path: string | null
          price_per_person: number
          tour_type: 'excursion' | 'hiking' | 'cruise' | 'bus_tour' | 'walking_tour'
          category: 'history' | 'nature' | 'culture' | 'architecture' | 'food' | 'adventure'
          start_date: string
          end_date: string | null
          max_participants: number
          current_participants: number
          is_available: boolean
          yandex_map_data: Json | null
          status: 'draft' | 'active' | 'completed' | 'cancelled'
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
          cover_path?: string | null
          price_per_person: number
          tour_type?: 'excursion' | 'hiking' | 'cruise' | 'bus_tour' | 'walking_tour'
          category?: 'history' | 'nature' | 'culture' | 'architecture' | 'food' | 'adventure'
          start_date: string
          end_date?: string | null
          max_participants?: number
          yandex_map_data?: Json | null
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
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
          cover_path?: string | null
          price_per_person?: number
          tour_type?: 'excursion' | 'hiking' | 'cruise' | 'bus_tour' | 'walking_tour'
          category?: 'history' | 'nature' | 'culture' | 'architecture' | 'food' | 'adventure'
          start_date?: string
          end_date?: string | null
          max_participants?: number
          yandex_map_data?: Json | null
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
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
      reviews: {
        Row: {
          id: string
          user_id: string
          tour_id: string
          booking_id: string
          rating: number
          text: string | null
          video_url: string | null
          video_path: string | null
          is_approved: boolean
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tour_id: string
          booking_id: string
          rating: number
          text?: string | null
          video_url?: string | null
          video_path?: string | null
          is_approved?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tour_id?: string
          booking_id?: string
          rating?: number
          text?: string | null
          video_url?: string | null
          video_path?: string | null
          is_approved?: boolean
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_review_tour: {
        Args: {
          p_user_id: string
          p_tour_id: string
        }
        Returns: {
          can_review: boolean
          booking_id: string | null
          reason: string
        }[]
      }
      get_tour_average_rating: {
        Args: {
          p_tour_id: string
        }
        Returns: {
          average_rating: number
          total_reviews: number
        }[]
      }
    }
    Enums: {
      user_role: 'user' | 'tour_admin' | 'support_admin' | 'super_admin'
      tour_status: 'draft' | 'active' | 'completed' | 'cancelled'
      tour_type: 'excursion' | 'hiking' | 'cruise' | 'bus_tour' | 'walking_tour'
      tour_category: 'history' | 'nature' | 'culture' | 'architecture' | 'food' | 'adventure'
      media_type: 'image' | 'video'
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    }
  }
}

