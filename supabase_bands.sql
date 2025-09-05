-- Create bands table
CREATE TABLE bands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create band_members table for many-to-many relationship
CREATE TABLE band_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  band_id uuid REFERENCES bands(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(band_id, user_id)
);

-- Add band_id to profiles table (nullable since users might not have joined a band yet)
ALTER TABLE profiles ADD COLUMN band_id uuid REFERENCES bands(id) ON DELETE SET NULL;

-- Enable RLS on bands table
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;

-- Enable RLS on band_members table  
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

-- Policies for bands table
CREATE POLICY "Anyone can view bands" ON bands
  FOR SELECT USING (true);

CREATE POLICY "Users can create bands" ON bands
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Band creators and members can update bands" ON bands
  FOR UPDATE USING (
    auth.uid() = created_by OR 
    auth.uid() IN (
      SELECT user_id FROM band_members WHERE band_id = bands.id
    )
  );

CREATE POLICY "Band creators can delete bands" ON bands
  FOR DELETE USING (auth.uid() = created_by);

-- Policies for band_members table
CREATE POLICY "Users can view their own band memberships" ON band_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can join bands" ON band_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave bands" ON band_members
  FOR DELETE USING (auth.uid() = user_id);

-- Update songs table to be band-specific instead of user-specific
ALTER TABLE songs DROP CONSTRAINT IF EXISTS songs_user_id_fkey;
ALTER TABLE songs ADD COLUMN band_id uuid REFERENCES bands(id) ON DELETE CASCADE;

-- Update songs policies to be band-based
DROP POLICY IF EXISTS "Users can view own songs" ON songs;
DROP POLICY IF EXISTS "Users can insert own songs" ON songs;
DROP POLICY IF EXISTS "Users can update own songs" ON songs;
DROP POLICY IF EXISTS "Users can delete own songs" ON songs;

CREATE POLICY "Band members can view band songs" ON songs
  FOR SELECT USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can insert band songs" ON songs
  FOR INSERT WITH CHECK (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can update band songs" ON songs
  FOR UPDATE USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Band members can delete band songs" ON songs
  FOR DELETE USING (
    band_id IN (
      SELECT band_id FROM band_members WHERE user_id = auth.uid()
    )
  );

-- Function to automatically add creator to band_members when band is created
CREATE OR REPLACE FUNCTION public.add_creator_to_band_members()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.band_members (band_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'creator');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add creator as band member
CREATE TRIGGER add_creator_to_band_trigger
  AFTER INSERT ON bands
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_to_band_members();