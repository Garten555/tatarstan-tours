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
          role: 'user' | 'tour_admin' | 'support_admin' | 'super_admin' | 'guide'
          avatar_url: string | null
          avatar_path: string | null
          username: string | null
          display_name: string | null
          bio: string | null
          public_profile_enabled: boolean
          status_level: number
          reputation_score: number
          is_banned: boolean | null
          banned_at: string | null
          ban_reason: string | null
          ban_until: string | null
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
          role?: 'user' | 'tour_admin' | 'support_admin' | 'super_admin' | 'guide'
          avatar_url?: string | null
          avatar_path?: string | null
          username?: string | null
          display_name?: string | null
          bio?: string | null
          public_profile_enabled?: boolean
          status_level?: number
          reputation_score?: number
          is_banned?: boolean | null
          banned_at?: string | null
          ban_reason?: string | null
          ban_until?: string | null
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
          role?: 'user' | 'tour_admin' | 'support_admin' | 'super_admin' | 'guide'
          avatar_url?: string | null
          avatar_path?: string | null
          username?: string | null
          display_name?: string | null
          bio?: string | null
          public_profile_enabled?: boolean
          status_level?: number
          reputation_score?: number
          is_banned?: boolean | null
          banned_at?: string | null
          ban_reason?: string | null
          ban_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      travel_diaries: {
        Row: {
          id: string
          user_id: string
          tour_id: string | null
          booking_id: string | null
          title: string
          content: string | null
          cover_image_url: string | null
          cover_image_path: string | null
          media_items: Json
          location_data: Json | null
          travel_date: string | null
          status: 'draft' | 'published' | 'private'
          visibility: 'private' | 'friends' | 'public'
          user_consent: boolean
          auto_generated: boolean
          views_count: number
          likes_count: number
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tour_id?: string | null
          booking_id?: string | null
          title: string
          content?: string | null
          cover_image_url?: string | null
          cover_image_path?: string | null
          media_items?: Json
          location_data?: Json | null
          travel_date?: string | null
          status?: 'draft' | 'published' | 'private'
          visibility?: 'private' | 'friends' | 'public'
          user_consent?: boolean
          auto_generated?: boolean
          views_count?: number
          likes_count?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tour_id?: string | null
          booking_id?: string | null
          title?: string
          content?: string | null
          cover_image_url?: string | null
          cover_image_path?: string | null
          media_items?: Json
          location_data?: Json | null
          travel_date?: string | null
          status?: 'draft' | 'published' | 'private'
          visibility?: 'private' | 'friends' | 'public'
          user_consent?: boolean
          auto_generated?: boolean
          views_count?: number
          likes_count?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          badge_type: string
          badge_name: string
          badge_description: string | null
          badge_icon_url: string | null
          tour_id: string | null
          diary_id: string | null
          unlock_date: string
          verification_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_type: string
          badge_name: string
          badge_description?: string | null
          badge_icon_url?: string | null
          tour_id?: string | null
          diary_id?: string | null
          unlock_date?: string
          verification_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_type?: string
          badge_name?: string
          badge_description?: string | null
          badge_icon_url?: string | null
          tour_id?: string | null
          diary_id?: string | null
          unlock_date?: string
          verification_data?: Json | null
          created_at?: string
        }
      }
      user_follows: {
        Row: {
          follower_id: string
          followed_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          followed_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          followed_id?: string
          created_at?: string
        }
      }
      diary_likes: {
        Row: {
          id: string
          diary_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          diary_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          diary_id?: string
          user_id?: string
          created_at?: string
        }
      }
      activity_feed: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          target_type: string | null
          target_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          target_type?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          target_type?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string
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
          yandex_map_url: string | null
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
          yandex_map_url?: string | null
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
          yandex_map_url?: string | null
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
      user_travelers: {
        Row: {
          id: string
          user_id: string
          full_name: string
          relationship: string | null
          is_child: boolean
          email: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          relationship?: string | null
          is_child?: boolean
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          relationship?: string | null
          is_child?: boolean
          email?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      site_settings: {
        Row: {
          key: string
          value_json: Json
          updated_at: string
        }
        Insert: {
          key: string
          value_json?: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value_json?: Json
          updated_at?: string
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
          is_reported: boolean | null
          reported_at: string | null
          reported_by: string | null
          report_reason: string | null
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
          is_reported?: boolean | null
          reported_at?: string | null
          reported_by?: string | null
          report_reason?: string | null
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
          is_reported?: boolean | null
          reported_at?: string | null
          reported_by?: string | null
          report_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      review_reactions: {
        Row: {
          id: string
          review_id: string
          user_id: string
          reaction: string
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          user_id: string
          reaction: string
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          user_id?: string
          reaction?: string
          created_at?: string
        }
      }
      review_comments: {
        Row: {
          id: string
          review_id: string
          user_id: string
          message: string
          is_reported: boolean | null
          reported_at: string | null
          reported_by: string | null
          report_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          user_id: string
          message: string
          is_reported?: boolean | null
          reported_at?: string | null
          reported_by?: string | null
          report_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          user_id?: string
          message?: string
          is_reported?: boolean | null
          reported_at?: string | null
          reported_by?: string | null
          report_reason?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string | null
          type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body?: string | null
          type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string | null
          type?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      // review_replies removed
      review_media: {
        Row: {
          id: string
          review_id: string
          media_type: string
          media_url: string
          media_path: string | null
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          media_type: string
          media_url: string
          media_path?: string | null
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          media_type?: string
          media_url?: string
          media_path?: string | null
          order_index?: number | null
          created_at?: string
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
      user_role: 'user' | 'guide' | 'tour_admin' | 'support_admin' | 'super_admin'
      tour_status: 'draft' | 'active' | 'completed' | 'cancelled'
      tour_type: 'excursion' | 'hiking' | 'cruise' | 'bus_tour' | 'walking_tour'
      tour_category: 'history' | 'nature' | 'culture' | 'architecture' | 'food' | 'adventure'
      media_type: 'image' | 'video'
      booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    }
  }
}

