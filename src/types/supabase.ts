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
                    updated_at: string | null
                    full_name: string | null
                    avatar_url: string | null
                    website: string | null
                    default_fx_source: string | null
                }
                Insert: {
                    id: string
                    updated_at?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    default_fx_source?: string | null
                }
                Update: {
                    id?: string
                    updated_at?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    website?: string | null
                    default_fx_source?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            trades: {
                Row: {
                    id: string
                    user_id: string
                    instrument_symbol: string
                    instrument_type: string
                    side: "BUY" | "SELL"
                    quantity: number
                    amount_ars: number
                    fx_source: string
                    fx_rate: number
                    amount_usd: number
                    trade_date: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    instrument_symbol: string
                    instrument_type: string
                    side: "BUY" | "SELL"
                    quantity: number
                    amount_ars: number
                    fx_source: string
                    fx_rate: number
                    amount_usd: number
                    trade_date?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    instrument_symbol?: string
                    instrument_type?: string
                    side?: "BUY" | "SELL"
                    quantity?: number
                    amount_ars?: number
                    fx_source?: string
                    fx_rate?: number
                    amount_usd?: number
                    trade_date?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "trades_user_id_fkey"
                        columns: ["user_id"]
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
