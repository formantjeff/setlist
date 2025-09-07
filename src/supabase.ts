import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Song {
  id: string
  user_id: string
  band_id: string
  setlist_id?: string
  name: string
  artist?: string
  lyrics?: string
  chords?: string
  notes?: string
  thumbnail_url?: string
  duration?: string
  tempo?: number
  position?: number
  created_at: string
  updated_at: string
  // Spotify metadata
  spotify_id?: string
  spotify_url?: string
  album?: string
  release_date?: string
  popularity?: number
  preview_url?: string
}

export interface Profile {
  id: string
  display_name?: string
  instrument?: string
  photo_url?: string
  band_id?: string | null
  created_at: string
  updated_at: string
}

export interface Band {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface BandMember {
  id: string
  band_id: string
  user_id: string
  role: string
  joined_at: string
}

export interface Setlist {
  id: string
  name: string
  description?: string
  venue?: string
  created_at: string
  updated_at: string
  band_id: string
  created_by: string
  total_duration?: string
  song_count?: number
}