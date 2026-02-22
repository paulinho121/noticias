export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          id: string
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          title: string
          message: string
          type?: string
          is_read?: boolean
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          created_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      feed_items: {
        Row: {
          created_at: string
          error_message: string | null
          feed_id: string
          id: string
          processed_at: string | null
          rewritten_content: string | null
          rewritten_title: string | null
          source_content: string | null
          source_image: string | null
          source_pub_date: string | null
          source_title: string
          source_url: string
          status: string
          slug: string | null
          meta_description: string | null
          tags: string[] | null
          viral_titles: string[] | null
          rewritten_image: string | null
          keywords: string[] | null
          social_summary: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          feed_id: string
          id?: string
          processed_at?: string | null
          rewritten_content?: string | null
          rewritten_title?: string | null
          source_content?: string | null
          source_image?: string | null
          source_pub_date?: string | null
          source_title: string
          source_url: string
          status?: string
          slug?: string | null
          meta_description?: string | null
          tags?: string[] | null
          viral_titles?: string[] | null
          rewritten_image?: string | null
          keywords?: string[] | null
          social_summary?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          feed_id?: string
          id?: string
          processed_at?: string | null
          rewritten_content?: string | null
          rewritten_title?: string | null
          source_content?: string | null
          source_image?: string | null
          source_pub_date?: string | null
          source_title?: string
          source_url?: string
          status?: string
          slug?: string | null
          meta_description?: string | null
          tags?: string[] | null
          viral_titles?: string[] | null
          rewritten_image?: string | null
          keywords?: string[] | null
          social_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      feeds: {
        Row: {
          author_id: string | null
          auto_publish: boolean
          avoid_logo: boolean
          category_id: string | null
          created_at: string
          extract_images: boolean
          id: string
          image_selector: string | null
          is_active: boolean
          name: string
          post_status: string
          updated_at: string
          url: string
          custom_prompt: string | null
          is_pending_review: boolean
          source_type: string
          keywords: string | null
          image_engine: string
          generate_highlights: boolean
          credit_source: boolean
          image_credit_text: string | null
        }
        Insert: {
          author_id?: string | null
          auto_publish?: boolean
          avoid_logo?: boolean
          category_id?: string | null
          created_at?: string
          extract_images?: boolean
          id?: string
          image_selector?: string | null
          is_active?: boolean
          name: string
          post_status?: string
          updated_at?: string
          url: string
          custom_prompt?: string | null
          is_pending_review?: boolean
          source_type?: string
          keywords?: string | null
          image_engine?: string
          generate_highlights?: boolean
          credit_source?: boolean
          image_credit_text?: string | null
        }
        Update: {
          author_id?: string | null
          auto_publish?: boolean
          avoid_logo?: boolean
          category_id?: string | null
          created_at?: string
          extract_images?: boolean
          id?: string
          image_selector?: string | null
          is_active?: boolean
          name?: string
          post_status?: string
          updated_at?: string
          url?: string
          custom_prompt?: string | null
          is_pending_review?: boolean
          source_type?: string
          keywords?: string | null
          image_engine?: string
          generate_highlights?: boolean
          credit_source?: boolean
          image_credit_text?: string | null
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          error_details: string | null
          feed_id: string | null
          feed_item_id: string | null
          id: string
          message: string
          post_id: string | null
          source_title: string | null
          source_url: string | null
          status: string
          step: string
        }
        Insert: {
          created_at?: string
          error_details?: string | null
          feed_id?: string | null
          feed_item_id?: string | null
          id?: string
          message: string
          post_id?: string | null
          source_title?: string | null
          source_url?: string | null
          status: string
          step: string
        }
        Update: {
          created_at?: string
          error_details?: string | null
          feed_id?: string | null
          feed_item_id?: string | null
          id?: string
          message?: string
          post_id?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          days: string[] | null
          feed_id: string
          id: string
          interval_minutes: number | null
          is_active: boolean
          last_run: string | null
          next_run: string | null
          schedule_time: string | null
          schedule_type: string
        }
        Insert: {
          created_at?: string
          days?: string[] | null
          feed_id: string
          id?: string
          interval_minutes?: number | null
          is_active?: boolean
          last_run?: string | null
          next_run?: string | null
          schedule_time?: string | null
          schedule_type?: string
        }
        Update: {
          created_at?: string
          days?: string[] | null
          feed_id?: string
          id?: string
          interval_minutes?: number | null
          is_active?: boolean
          last_run?: string | null
          next_run?: string | null
          schedule_time?: string | null
          schedule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          favicon_url: string | null
          primary_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          favicon_url?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          favicon_url?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
