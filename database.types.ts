export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: number
          car_id: number
          user_id: string
          checkout_id: string
          date_range: string
          pickup_location: string
          pickup_time: number
          pickup_time_formatted: string | null
          dropoff_time: string | null
          status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
          total_price: number | null
          payment_status: 'pending' | 'paid' | 'refunded'
          booking_ref: string | null
          discount_code: string | null
          notes: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          car_id: number
          user_id: string
          checkout_id: string
          date_range: string
          pickup_location: string
          pickup_time: number
          pickup_time_formatted?: string | null
          dropoff_time?: string | null
          status?: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
          total_price?: number | null
          payment_status?: 'pending' | 'paid' | 'refunded'
          booking_ref?: string | null
          discount_code?: string | null
          notes?: string | null
          id?: number
        }
        Update: {
          car_id?: number
          user_id?: string
          checkout_id?: string
          date_range?: string
          pickup_location?: string
          pickup_time?: number
          pickup_time_formatted?: string | null
          dropoff_time?: string | null
          status?: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
          total_price?: number | null
          payment_status?: 'pending' | 'paid' | 'refunded'
          booking_ref?: string | null
          discount_code?: string | null
          notes?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_types: {
        Row: {
          id: number
          type: string
        }
        Insert: {
          id?: number
          type: string
        }
        Update: {
          id?: number
          type?: string
        }
        Relationships: []
      }
      cars: {
        Row: {
          id: number
          manufacturer: string
          model: string
          type_id: number
          price_per_day: number
          fuel: number
          seats: number
          color: string
          img_urls: string[] | null
          owner_id: string
          horsepower: number | null
          torque: string | null
          engine_type: string | null
          transmission: string | null
          drivetrain: string | null
          zero_to_sixty: number | null
          top_speed: number | null
          fuel_capacity: number | null
          mileage: number | null
          year: number | null
          description: string | null
          is_available: boolean
          is_archived: boolean
          luggage_capacity: number | null
          features: string[] | null
          status: 'available' | 'rented' | 'maintenance'
          created_at: string
          updated_at: string
        }
        Insert: {
          manufacturer: string
          model: string
          type_id: number
          price_per_day: number
          fuel: number
          seats: number
          color: string
          img_urls?: string[] | null
          owner_id: string
          horsepower?: number | null
          torque?: string | null
          engine_type?: string | null
          transmission?: string | null
          drivetrain?: string | null
          zero_to_sixty?: number | null
          top_speed?: number | null
          fuel_capacity?: number | null
          mileage?: number | null
          year?: number | null
          description?: string | null
          is_available?: boolean
          is_archived?: boolean
          luggage_capacity?: number | null
          features?: string[] | null
          status?: 'available' | 'rented' | 'maintenance'
          id?: number
        }
        Update: {
          manufacturer?: string
          model?: string
          type_id?: number
          price_per_day?: number
          fuel?: number
          seats?: number
          color?: string
          img_urls?: string[] | null
          owner_id?: string
          horsepower?: number | null
          torque?: string | null
          engine_type?: string | null
          transmission?: string | null
          drivetrain?: string | null
          zero_to_sixty?: number | null
          top_speed?: number | null
          fuel_capacity?: number | null
          mileage?: number | null
          year?: number | null
          description?: string | null
          is_available?: boolean
          is_archived?: boolean
          luggage_capacity?: number | null
          features?: string[] | null
          status?: 'available' | 'rented' | 'maintenance'
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cars_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "car_types"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          id: number
          code: string
          discount_percent: number
          valid_from: string
          valid_to: string
          max_uses: number | null
          current_uses: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          code: string
          discount_percent: number
          valid_from?: string
          valid_to: string
          max_uses?: number | null
          current_uses?: number
          is_active?: boolean
          id?: number
        }
        Update: {
          code?: string
          discount_percent?: number
          valid_from?: string
          valid_to?: string
          max_uses?: number | null
          current_uses?: number
          is_active?: boolean
          id?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: number
          user_id: string
          type: 'info' | 'success' | 'warning' | 'booking' | 'review' | 'system'
          title: string
          message: string
          is_read: boolean
          link: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          type?: 'info' | 'success' | 'warning' | 'booking' | 'review' | 'system'
          title: string
          message: string
          is_read?: boolean
          link?: string | null
          id?: number
        }
        Update: {
          user_id?: string
          type?: 'info' | 'success' | 'warning' | 'booking' | 'review' | 'system'
          title?: string
          message?: string
          is_read?: boolean
          link?: string | null
          id?: number
        }
        Relationships: []
      }
      payment_sessions: {
        Row: {
          id: string
          user_id: string
          car_id: number
          booking_data: Json
          status: 'pending' | 'confirmed' | 'expired' | 'cancelled'
          amount: number
          created_at: string
          confirmed_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          car_id: number
          booking_data: Json
          status?: 'pending' | 'confirmed' | 'expired' | 'cancelled'
          amount: number
          created_at?: string
          confirmed_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          car_id?: number
          booking_data?: Json
          status?: 'pending' | 'confirmed' | 'expired' | 'cancelled'
          amount?: number
          created_at?: string
          confirmed_at?: string | null
          expires_at?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          id: number
          user_id: string
          car_id: number
          viewed_at: string
        }
        Insert: {
          user_id: string
          car_id: number
          viewed_at?: string
          id?: number
        }
        Update: {
          user_id?: string
          car_id?: number
          viewed_at?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          id: number
          booking_id: number | null
          user_id: string
          car_id: number
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          booking_id?: number | null
          user_id: string
          car_id: number
          rating: number
          comment?: string | null
          id?: number
        }
        Update: {
          booking_id?: number | null
          user_id?: string
          car_id?: number
          rating?: number
          comment?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          user_id: string
          display_name: string | null
          phone: string | null
          license_number: string | null
          license_expiry: string | null
          avatar_url: string | null
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          display_name?: string | null
          phone?: string | null
          license_number?: string | null
          license_expiry?: string | null
          avatar_url?: string | null
          preferences?: Json | null
        }
        Update: {
          display_name?: string | null
          phone?: string | null
          license_number?: string | null
          license_expiry?: string | null
          avatar_url?: string | null
          preferences?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: 'customer' | 'admin'
          created_at: string
        }
        Insert: {
          user_id: string
          role?: 'customer' | 'admin'
        }
        Update: {
          role?: 'customer' | 'admin'
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          id: number
          user_id: string
          car_id: number
          created_at: string
        }
        Insert: {
          user_id: string
          car_id: number
          id?: number
        }
        Update: {
          user_id?: string
          car_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
