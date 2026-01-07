-- Create custom types
DROP TYPE IF EXISTS public.user_role;
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');

DROP TYPE IF EXISTS public.ad_status;
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');

DROP TYPE IF EXISTS public.comment_status;
CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected');

DROP TYPE IF EXISTS public.media_type;
CREATE TYPE public.media_type AS ENUM ('image', 'video');


-- Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  role user_role DEFAULT 'USER'::public.user_role,
  updated_at timestamptz,
  -- Advertiser specific fields
  country_id integer,
  contact_email text,
  contact_whatsapp text,
  contact_telegram text,
  contact_social_url text
);
COMMENT ON TABLE public.profiles IS 'Profile data for users';

-- Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name text NOT NULL UNIQUE
);
COMMENT ON TABLE public.categories IS 'Ad categories';

-- Create Locations Table
CREATE TABLE IF NOT EXISTS public.locations (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL, -- 'country', 'region', 'subregion'
  parent_id INTEGER REFERENCES public.locations(id),
  code text, -- e.g., 'ES', 'CO'
  phone_code text
);
COMMENT ON TABLE public.locations IS 'Countries, regions, and subregions';


-- Create Ads Table
CREATE TABLE IF NOT EXISTS public.ads (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category_id integer REFERENCES public.categories(id),
  country_id integer REFERENCES public.locations(id),
  region_id integer REFERENCES public.locations(id),
  subregion_id integer REFERENCES public.locations(id),
  status ad_status DEFAULT 'draft'::public.ad_status,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  boosted_until timestamptz,
  slug text NOT NULL UNIQUE,
  tags text[]
);
COMMENT ON TABLE public.ads IS 'Classified ads';
CREATE INDEX IF NOT EXISTS ads_user_id_idx ON public.ads(user_id);
CREATE INDEX IF NOT EXISTS ads_slug_idx ON public.ads(slug);
CREATE INDEX IF NOT EXISTS ads_tags_idx ON public.ads USING GIN (tags);


-- Create Ad Media Table
CREATE TABLE IF NOT EXISTS public.ad_media (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    url text NOT NULL,
    type media_type NOT NULL,
    is_cover BOOLEAN DEFAULT FALSE,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.ad_media IS 'Media (images/videos) associated with ads';


-- Create Ad Ratings Table
CREATE TABLE IF NOT EXISTS public.ad_ratings (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz DEFAULT now(),
    UNIQUE (ad_id, user_id)
);
COMMENT ON TABLE public.ad_ratings IS 'User ratings for ads';


-- Create Ad Comments Table
CREATE TABLE IF NOT EXISTS public.ad_comments (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment text NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.ad_comments IS 'User comments on ads';


---------------------------------------------------
-- AUTOMATION with Triggers and Functions
---------------------------------------------------

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    (new.raw_user_meta_data->>'role')::public.user_role
  );
  RETURN new;
END;
$$;

-- Trigger to run the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


---------------------------------------------------
-- STORAGE and Policies
---------------------------------------------------

-- Create Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create Storage bucket for ad media
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad_media', 'ad_media', true)
ON CONFLICT (id) DO NOTHING;


-- Policies for 'avatars' bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar."
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar."
ON storage.objects FOR UPDATE
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'avatars');

-- Policies for 'ad_media' bucket
DROP POLICY IF EXISTS "Ad media is publicly accessible." ON storage.objects;
CREATE POLICY "Ad media is publicly accessible."
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_media');

DROP POLICY IF EXISTS "Advertisers can upload media for their ads." ON storage.objects;
CREATE POLICY "Advertisers can upload media for their ads."
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ad_media' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
);

DROP POLICY IF EXISTS "Advertisers can delete their own media." ON storage.objects;
CREATE POLICY "Advertisers can delete their own media."
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ad_media' AND
    auth.uid() = owner
);


---------------------------------------------------
-- ROW LEVEL SECURITY (RLS) and Policies
---------------------------------------------------

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;

-- Policies for 'profiles' table
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone."
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- Policies for 'categories' and 'locations'
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone."
ON public.categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Locations are viewable by everyone." ON public.locations;
CREATE POLICY "Locations are viewable by everyone."
ON public.locations FOR SELECT
USING (true);


-- Policies for 'ads' table
DROP POLICY IF EXISTS "Ads are viewable by everyone." ON public.ads;
CREATE POLICY "Ads are viewable by everyone."
ON public.ads FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Advertisers can create their own ads." ON public.ads;
CREATE POLICY "Advertisers can create their own ads."
ON public.ads FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
);

DROP POLICY IF EXISTS "Advertisers can update their own ads." ON public.ads;
CREATE POLICY "Advertisers can update their own ads."
ON public.ads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can delete their own ads." ON public.ads;
CREATE POLICY "Advertisers can delete their own ads."
ON public.ads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- Policies for 'ad_media' table
DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
CREATE POLICY "Ad media is viewable by everyone."
ON public.ad_media FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Advertisers can manage media for their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can manage media for their own ads."
ON public.ad_media FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- Policies for 'ad_ratings'
DROP POLICY IF EXISTS "Ratings are visible to everyone" ON public.ad_ratings;
CREATE POLICY "Ratings are visible to everyone"
ON public.ad_ratings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can add/update their own ratings" ON public.ad_ratings;
CREATE POLICY "Users can add/update their own ratings"
ON public.ad_ratings FOR ALL
TO authenticated
USING ( auth.uid() = user_id AND (SELECT id FROM ads WHERE id = ad_id AND user_id <> auth.uid()) IS NOT NULL )
WITH CHECK ( auth.uid() = user_id AND (SELECT id FROM ads WHERE id = ad_id AND user_id <> auth.uid()) IS NOT NULL );


-- Policies for 'ad_comments'
DROP POLICY IF EXISTS "Approved comments are visible to everyone" ON public.ad_comments;
CREATE POLICY "Approved comments are visible to everyone"
ON public.ad_comments FOR SELECT
USING (status = 'approved');

DROP POLICY IF EXISTS "Users can see their own pending/rejected comments" ON public.ad_comments;
CREATE POLICY "Users can see their own pending/rejected comments"
ON public.ad_comments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROPPOLICY IF EXISTS "Advertisers can see all comments on their ads" ON public.ad_comments;
CREATE POLICY "Advertisers can see all comments on their ads"
ON public.ad_comments FOR SELECT
TO authenticated
USING ((SELECT user_id FROM ads WHERE id = ad_comments.ad_id) = auth.uid());

DROP POLICY IF EXISTS "Users can post comments" ON public.ad_comments;
CREATE POLICY "Users can post comments"
ON public.ad_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.ad_comments;
CREATE POLICY "Users can delete their own comments"
ON public.ad_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can moderate comments on their ads" ON public.ad_comments;
CREATE POLICY "Advertisers can moderate comments on their ads"
ON public ad_comments FOR UPDATE
TO authenticated
USING ((SELECT user_id FROM ads WHERE id = ad_comments.ad_id) = auth.uid())
WITH CHECK ((SELECT user_id FROM ads WHERE id = ad_comments.ad_id) = auth.uid());


---------------------------------------------------
-- INITIAL DATA SEEDING
---------------------------------------------------

-- Seed Categories
INSERT INTO public.categories (name) VALUES
('Scorts'),
('Chicas Trans'),
('Scorts Gay'),
('Servicios Virtuales')
ON CONFLICT (name) DO NOTHING;

-- Seed Locations
-- Insert countries first
INSERT INTO public.locations (id, name, type, code) VALUES
(1, 'Colombia', 'country', 'CO'),
(2, 'España', 'country', 'ES')
ON CONFLICT (id) DO NOTHING;

-- Insert regions, referencing countries
INSERT INTO public.locations (id, name, type, parent_id) VALUES
(101, 'Antioquia', 'region', 1),
(102, 'Madrid', 'region', 2)
ON CONFLICT (id) DO NOTHING;

-- Insert subregions/cities, referencing regions
INSERT INTO public.locations (id, name, type, parent_id) VALUES
(1001, 'Medellín', 'subregion', 101),
(1002, 'Madrid', 'subregion', 102)
ON CONFLICT (id) DO NOTHING;

-- Update sequence for locations table to avoid conflicts with manual IDs
SELECT setval('public.locations_id_seq', (SELECT MAX(id) FROM public.locations));
