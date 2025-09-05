# Supabase Storage Setup for Image Upload

## 🎯 **Issue**
Image upload fails because the `song-images` bucket doesn't exist in Supabase Storage.

## 🛠️ **Solution**

### Step 1: Create Storage Bucket
1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"Create a new bucket"**
4. Set bucket name: `song-images`
5. Make it **Public** (so images can be viewed)
6. Click **"Save"**

### Step 2: Set Bucket Policies (if needed)
The bucket should be publicly readable. If you have issues, add this RLS policy:

```sql
-- Allow public read access to song-images bucket
CREATE POLICY "Public read access for song images" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'song-images');

-- Allow authenticated users to upload to song-images bucket
CREATE POLICY "Authenticated users can upload song images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'song-images');
```

### Step 3: Test Image Upload
1. Go to your app in edit mode
2. Click on a song to edit it
3. Click "Edit" under Song Details
4. Try uploading a thumbnail image
5. Should now work without errors!

## ✅ **Verification**
- No error messages when uploading
- Image appears in song cards
- Image preview works in edit mode