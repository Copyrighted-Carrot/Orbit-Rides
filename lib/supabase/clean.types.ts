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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      booking_events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          booking_id: string
          booking_reference: string | null
          event_type: string
          id: number
          new_state: string | null
          occurred_at: string
          previous_state: string | null
          reason: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind: string
          booking_id: string
          booking_reference?: string | null
          event_type: string
          id?: never
          new_state?: string | null
          occurred_at: string
          previous_state?: string | null
          reason: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          booking_id?: string
          booking_reference?: string | null
          event_type?: string
          id?: never
          new_state?: string | null
          occurred_at?: string
          previous_state?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          customer_id: string
          hold_expires_at: string
          id: string
          quote_id: string
          reference: string
          state: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at: string
          customer_id: string
          hold_expires_at: string
          id?: string
          quote_id: string
          reference?: string
          state: string
          updated_at: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          hold_expires_at?: string
          id?: string
          quote_id?: string
          reference?: string
          state?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_quote_id_vehicle_id_customer_id_fkey"
            columns: ["quote_id", "vehicle_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id", "vehicle_id", "customer_id"]
          },
        ]
      }
      cancellation_requests: {
        Row: {
          booking_id: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          id: string
          reason: string
          requested_at: string
          requested_by: string
        }
        Insert: {
          booking_id: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          id: string
          reason: string
          requested_at: string
          requested_by: string
        }
        Update: {
          booking_id?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          id?: string
          reason?: string
          requested_at?: string
          requested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_media: {
        Row: {
          byte_length: number
          content_sha256: string | null
          content_type: string
          created_at: string
          created_by: string
          height: number | null
          id: string
          inspection_id: string
          object_path: string
          state: string
          validated_at: string | null
          validated_object_id: string | null
          width: number | null
        }
        Insert: {
          byte_length: number
          content_sha256?: string | null
          content_type: string
          created_at: string
          created_by: string
          height?: number | null
          id?: string
          inspection_id: string
          object_path: string
          state?: string
          validated_at?: string | null
          validated_object_id?: string | null
          width?: number | null
        }
        Update: {
          byte_length?: number
          content_sha256?: string | null
          content_type?: string
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          inspection_id?: string
          object_path?: string
          state?: string
          validated_at?: string | null
          validated_object_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_media_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_outcomes: {
        Row: {
          inspected_at: string
          inspected_by: string
          inspection_id: string
          passed: boolean
          reason: string
        }
        Insert: {
          inspected_at: string
          inspected_by: string
          inspection_id: string
          passed: boolean
          reason: string
        }
        Update: {
          inspected_at?: string
          inspected_by?: string
          inspection_id?: string
          passed?: boolean
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_outcomes_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          booking_id: string
          condition: string
          damage: string
          fuel_percent: number
          id: string
          kind: string
          odometer_km: number
          recorded_at: string
          recorded_by: string
          staff_notes: string
        }
        Insert: {
          booking_id: string
          condition: string
          damage: string
          fuel_percent: number
          id?: string
          kind: string
          odometer_km: number
          recorded_at: string
          recorded_by: string
          staff_notes: string
        }
        Update: {
          booking_id?: string
          condition?: string
          damage?: string
          fuel_percent?: number
          id?: string
          kind?: string
          odometer_km?: number
          recorded_at?: string
          recorded_by?: string
          staff_notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          customer_id: string
          event_id: number
          read_at: string | null
        }
        Insert: {
          created_at: string
          customer_id: string
          event_id: number
          read_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          event_id?: number
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "booking_events"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          actor_id: string | null
          amount_minor: number
          currency: string
          event_type: string
          id: string
          occurred_at: string
          provider: string
          reason: string
          session_id: string
        }
        Insert: {
          actor_id?: string | null
          amount_minor: number
          currency: string
          event_type: string
          id?: string
          occurred_at: string
          provider: string
          reason: string
          session_id: string
        }
        Update: {
          actor_id?: string | null
          amount_minor?: number
          currency?: string
          event_type?: string
          id?: string
          occurred_at?: string
          provider?: string
          reason?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_session_id_provider_amount_minor_currency_fkey"
            columns: ["session_id", "provider", "amount_minor", "currency"]
            isOneToOne: false
            referencedRelation: "payment_sessions"
            referencedColumns: ["id", "provider", "amount_minor", "currency"]
          },
        ]
      }
      payment_sessions: {
        Row: {
          amount_minor: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          provider: string
          state: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          booking_id: string
          created_at: string
          currency: string
          id?: string
          provider: string
          state: string
          updated_at: string
        }
        Update: {
          amount_minor?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_location: {
        Row: {
          address: string
          city: string
          name: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          name: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          name?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          billable_days: number
          created_at: string
          currency: string
          customer_id: string
          customer_name: string
          ends_at: string
          expires_at: string
          hold_seconds: number | null
          id: string
          pickup_location_snapshot: Json | null
          rate_minor: number
          request_id: string
          starts_at: string
          total_minor: number | null
          turnaround: string
          vehicle_id: string
          vehicle_label: string
        }
        Insert: {
          billable_days: number
          created_at: string
          currency: string
          customer_id: string
          customer_name: string
          ends_at: string
          expires_at: string
          hold_seconds?: number | null
          id?: string
          pickup_location_snapshot?: Json | null
          rate_minor: number
          request_id: string
          starts_at: string
          total_minor?: number | null
          turnaround: string
          vehicle_id: string
          vehicle_label: string
        }
        Update: {
          billable_days?: number
          created_at?: string
          currency?: string
          customer_id?: string
          customer_name?: string
          ends_at?: string
          expires_at?: string
          hold_seconds?: number | null
          id?: string
          pickup_location_snapshot?: Json | null
          rate_minor?: number
          request_id?: string
          starts_at?: string
          total_minor?: number | null
          turnaround?: string
          vehicle_id?: string
          vehicle_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_viewed: {
        Row: {
          customer_id: string
          vehicle_id: string
          viewed_at: string
        }
        Insert: {
          customer_id: string
          vehicle_id: string
          viewed_at: string
        }
        Update: {
          customer_id?: string
          vehicle_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string
          created_at: string
          rating: number
        }
        Insert: {
          booking_id: string
          comment: string
          created_at?: string
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string
          created_at?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          display_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_allocations: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by: string
          id: string
          maintenance_reason: string | null
          occupied: unknown
          released_at: string | null
          request_id: string | null
          vehicle_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at: string
          created_by: string
          id?: string
          maintenance_reason?: string | null
          occupied: unknown
          released_at?: string | null
          request_id?: string | null
          vehicle_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          maintenance_reason?: string | null
          occupied?: unknown
          released_at?: string | null
          request_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_allocations_booking_id_vehicle_id_fkey"
            columns: ["booking_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id", "vehicle_id"]
          },
          {
            foreignKeyName: "vehicle_allocations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_media: {
        Row: {
          byte_length: number
          category: string
          content_sha256: string | null
          content_type: string
          created_at: string
          created_by: string
          height: number | null
          id: string
          object_path: string
          position: number
          state: string
          validated_at: string | null
          validated_object_id: string | null
          vehicle_id: string
          width: number | null
        }
        Insert: {
          byte_length: number
          category: string
          content_sha256?: string | null
          content_type: string
          created_at?: string
          created_by: string
          height?: number | null
          id?: string
          object_path: string
          position: number
          state?: string
          validated_at?: string | null
          validated_object_id?: string | null
          vehicle_id: string
          width?: number | null
        }
        Update: {
          byte_length?: number
          category?: string
          content_sha256?: string | null
          content_type?: string
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          object_path?: string
          position?: number
          state?: string
          validated_at?: string | null
          validated_object_id?: string | null
          vehicle_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_types: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          currency: string
          daily_rate_minor: number
          fleet_code: string
          id: string
          manufacturer: string
          model: string
          operational_state: string
          published: boolean
          vehicle_type_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          daily_rate_minor: number
          fleet_code: string
          id?: string
          manufacturer: string
          model: string
          operational_state?: string
          published?: boolean
          vehicle_type_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          daily_rate_minor?: number
          fleet_code?: string
          id?: string
          manufacturer?: string
          model?: string
          operational_state?: string
          published?: boolean
          vehicle_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string
          customer_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abandon_checkout: { Args: { p_session_id: string }; Returns: string }
      approve_demo_payment: { Args: { p_session_id: string }; Returns: string }
      archive_vehicle: { Args: { p_vehicle_id: string }; Returns: undefined }
      attach_inspection_media: {
        Args: { p_media_id: string }
        Returns: undefined
      }
      available_vehicles: {
        Args: { p_ends_at: string; p_starts_at: string }
        Returns: {
          vehicle_id: string
        }[]
      }
      block_vehicle: {
        Args: {
          p_ends_at: string
          p_reason: string
          p_request_id: string
          p_starts_at: string
          p_vehicle_id: string
        }
        Returns: string
      }
      booking_receipt: {
        Args: { p_booking_id: string }
        Returns: {
          billable_days: number
          booking_id: string
          booking_reference: string
          booking_state: string
          confirmed_at: string
          currency: string
          customer_name: string
          ends_at: string
          payment_state: string
          provider: string
          rate_minor: number
          starts_at: string
          total_minor: number
          vehicle_id: string
          vehicle_label: string
        }[]
      }
      complete_booking: { Args: { p_booking_id: string }; Returns: string }
      configure_pickup_location: {
        Args: { p_address: string; p_city: string; p_name: string }
        Returns: undefined
      }
      create_quote: {
        Args: {
          p_ends_at: string
          p_request_id: string
          p_starts_at: string
          p_vehicle_id: string
        }
        Returns: string
      }
      create_vehicle: {
        Args: {
          p_daily_rate_minor: number
          p_fleet_code: string
          p_manufacturer: string
          p_model: string
          p_vehicle_type_id: string
        }
        Returns: string
      }
      decide_cancellation: {
        Args: { p_accept: boolean; p_reason: string; p_request_id: string }
        Returns: string
      }
      decline_demo_payment: { Args: { p_session_id: string }; Returns: string }
      discard_inspection_upload: {
        Args: { p_media_id: string }
        Returns: undefined
      }
      discard_vehicle_upload: {
        Args: { p_media_id: string }
        Returns: undefined
      }
      finalize_booking: { Args: { p_session_id: string }; Returns: string }
      finish_discarded_upload: {
        Args: { p_inspection?: boolean; p_media_id: string }
        Returns: undefined
      }
      finish_inspection: {
        Args: { p_booking_id: string; p_passed: boolean; p_reason: string }
        Returns: string
      }
      mark_notification_read: {
        Args: { p_event_id: number }
        Returns: undefined
      }
      mark_ready: { Args: { p_booking_id: string }; Returns: undefined }
      my_activity_summary: { Args: never; Returns: Json }
      my_rental_summary: {
        Args: never
        Returns: {
          completed_demo_rental_value_minor: number
          completed_rentals: number
          confirmed_rentals: number
          currency: string
        }[]
      }
      my_vehicle_activity: {
        Args: { p_kind: string; p_page?: number }
        Returns: Json
      }
      pick_up: {
        Args: {
          p_booking_id: string
          p_condition: string
          p_damage?: string
          p_fuel_percent: number
          p_odometer_km: number
          p_staff_notes?: string
        }
        Returns: string
      }
      prepare_inspection_media: {
        Args: {
          p_byte_length: number
          p_content_type: string
          p_inspection_id: string
        }
        Returns: {
          byte_length: number
          content_sha256: string | null
          content_type: string
          created_at: string
          created_by: string
          height: number | null
          id: string
          inspection_id: string
          object_path: string
          state: string
          validated_at: string | null
          validated_object_id: string | null
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "inspection_media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_vehicle_media: {
        Args: {
          p_byte_length: number
          p_category: string
          p_content_type: string
          p_position: number
          p_vehicle_id: string
        }
        Returns: {
          byte_length: number
          category: string
          content_sha256: string | null
          content_type: string
          created_at: string
          created_by: string
          height: number | null
          id: string
          object_path: string
          position: number
          state: string
          validated_at: string | null
          validated_object_id: string | null
          vehicle_id: string
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "vehicle_media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_vehicle_media: {
        Args: { p_media_id: string }
        Returns: undefined
      }
      reconcile_checkout: { Args: { p_session_id: string }; Returns: string }
      record_media_validation: {
        Args: {
          p_byte_length: number
          p_content_type: string
          p_height: number
          p_inspection: boolean
          p_media_id: string
          p_object_id: string
          p_sha256: string
          p_width: number
        }
        Returns: undefined
      }
      record_vehicle_view: {
        Args: { p_vehicle_id: string }
        Returns: undefined
      }
      release_maintenance_block: {
        Args: { p_allocation_id: string }
        Returns: undefined
      }
      request_cancellation: {
        Args: { p_booking_id: string; p_reason: string; p_request_id: string }
        Returns: string
      }
      retire_vehicle_media: { Args: { p_media_id: string }; Returns: undefined }
      return_vehicle: {
        Args: {
          p_booking_id: string
          p_condition: string
          p_damage?: string
          p_fuel_percent: number
          p_odometer_km: number
          p_staff_notes?: string
        }
        Returns: string
      }
      search_fleet: {
        Args: {
          p_ends_at?: string
          p_max_rate_minor?: number
          p_page?: number
          p_page_size?: number
          p_query?: string
          p_starts_at?: string
          p_type_id?: string
        }
        Returns: Json
      }
      set_vehicle_publication: {
        Args: { p_published: boolean; p_vehicle_id: string }
        Returns: undefined
      }
      set_wishlist: {
        Args: { p_saved: boolean; p_vehicle_id: string }
        Returns: undefined
      }
      start_checkout: { Args: { p_quote_id: string }; Returns: string }
      start_inspection: { Args: { p_booking_id: string }; Returns: undefined }
      submit_review: {
        Args: { p_booking_id: string; p_comment: string; p_rating: number }
        Returns: undefined
      }
      update_my_profile: { Args: { p_display_name: string }; Returns: string }
      update_vehicle_catalogue: {
        Args: {
          p_daily_rate_minor: number
          p_manufacturer: string
          p_model: string
          p_vehicle_id: string
          p_vehicle_type_id: string
        }
        Returns: undefined
      }
      vehicle_review_overview: {
        Args: { p_limit?: number; p_offset?: number; p_vehicle_id: string }
        Returns: Json
      }
      vehicle_review_summaries: {
        Args: { p_vehicle_ids: string[] }
        Returns: {
          average_rating: number
          review_count: number
          vehicle_id: string
        }[]
      }
      vehicle_review_summary: {
        Args: { p_vehicle_id: string }
        Returns: {
          average_rating: number
          review_count: number
        }[]
      }
      vehicle_reviews: {
        Args: { p_limit?: number; p_offset?: number; p_vehicle_id: string }
        Returns: {
          comment: string
          created_at: string
          rating: number
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
