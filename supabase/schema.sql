-- =================================================================
-- ENUMS
-- =================================================================
-- Drop existing types if they exist to prevent errors on re-run
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.ad_status;
DROP TYPE IF EXISTS public.media_type;
DROP TYPE IF EXISTS public.location_type;
DROP TYPE IF EXISTS public.comment_status;

-- Create the ENUM types
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');
CREATE TYPE public.media_type AS ENUM ('image', 'video');
CREATE TYPE public.location_type AS ENUM ('country', 'region', 'subregion');
CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected');

-- =================================================================
-- TABLES
-- =================================================================
-- Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    role user_role NOT NULL DEFAULT 'USER',
    updated_at timestamptz,
    country_id int,
    contact_email text,
    contact_whatsapp text,
    contact_telegram text,
    contact_social_url text,
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Categories Table
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name text NOT NULL UNIQUE
);

-- Locations Table
CREATE TABLE public.locations (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    type location_type NOT NULL,
    parent_id INT REFERENCES public.locations(id),
    code text, -- e.g., ISO 3166-1 alpha-2 for countries
    phone_code text,
    slug text UNIQUE
);
-- Add index for faster lookups by slug
CREATE INDEX ON public.locations (slug);
-- Add index for parent_id for faster hierarchy lookups
CREATE INDEX ON public.locations (parent_id);

-- Alter profiles to add foreign key to locations
ALTER TABLE public.profiles ADD CONSTRAINT fk_country FOREIGN KEY (country_id) REFERENCES public.locations(id);


-- Ads Table
CREATE TABLE public.ads (
    id BIGSERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    category_id int NOT NULL REFERENCES public.categories(id),
    country_id int REFERENCES public.locations(id),
    region_id int REFERENCES public.locations(id),
    subregion_id int REFERENCES public.locations(id),
    status ad_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    boosted_until timestamptz,
    slug text UNIQUE NOT NULL,
    tags text[]
);
-- Add indexes for faster querying
CREATE INDEX ON public.ads (user_id);
CREATE INDEX ON public.ads (category_id);
CREATE INDEX ON public.ads (status);
CREATE INDEX ON public.ads (country_id);
CREATE INDEX ON public.ads (region_id);

-- Ad Media Table
CREATE TABLE public.ad_media (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url text NOT NULL,
    type media_type NOT NULL,
    is_cover boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ad_media (ad_id);
CREATE INDEX ON public.ad_media (user_id);

-- Ad Ratings Table
CREATE TABLE public.ad_ratings (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (ad_id, user_id),
    -- Prevent user from rating their own ad
    CONSTRAINT user_cannot_rate_own_ad CHECK (user_id <> (SELECT user_id FROM ads WHERE id = ad_id))
);
CREATE INDEX ON public.ad_ratings (ad_id);
CREATE INDEX ON public.ad_ratings (user_id);


-- Ad Comments Table
CREATE TABLE public.ad_comments (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES public.ad_comments(id) ON DELETE CASCADE,
    comment text NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Prevent user from commenting on their own ad
    CONSTRAINT user_cannot_comment_own_ad CHECK (user_id <> (SELECT user_id FROM ads WHERE id = ad_id))
);
CREATE INDEX ON public.ad_comments (ad_id, status);

-- =================================================================
-- VIEWS
-- =================================================================
CREATE OR REPLACE VIEW public.ads_with_ratings AS
SELECT
  a.*,
  COALESCE(avg_ratings.avg_rating, 0) as avg_rating,
  COALESCE(avg_ratings.rating_count, 0) as rating_count
FROM
  public.ads a
LEFT JOIN (
  SELECT
    ad_id,
    AVG(rating) as avg_rating,
    COUNT(id) as rating_count
  FROM
    public.ad_ratings
  GROUP BY
    ad_id
) as avg_ratings ON a.id = avg_ratings.ad_id;


-- =================================================================
-- DB FUNCTIONS & TRIGGERS
-- =================================================================
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
    (new.raw_user_meta_data->>'role')::user_role
  );
  RETURN new;
END;
$$;

-- Trigger to run the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =================================================================
-- STORAGE
-- =================================================================
-- Avatars Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Ad Media Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ad_media', 'ad_media', true, 52428800) -- 50MB limit
ON CONFLICT (id) DO NOTHING;


-- =================================================================
-- RLS (ROW LEVEL SECURITY)
-- =================================================================
-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent errors on re-run
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view public tables." ON public.categories;
DROP POLICY IF EXISTS "Anyone can view public tables." ON public.locations;

DROP POLICY IF EXISTS "Active ads are viewable by everyone." ON public.ads;
DROP POLICY IF EXISTS "Advertisers can manage their own ads." ON public.ads;
DROP POLICY IF EXISTS "Users can view their own non-active ads" ON public.ads;

DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
DROP POLICY IF EXISTS "Advertisers can manage media for their own ads." ON public.ad_media;

DROP POLICY IF EXISTS "Ratings are public." ON public.ad_ratings;
DROP POLICY IF EXISTS "Users can insert/update their own ratings." ON public.ad_ratings;

DROP POLICY IF EXISTS "Approved comments are public." ON public.ad_comments;
DROP POLICY IF EXISTS "Users can manage their own comments." ON public.ad_comments;
DROP POLICY IF EXISTS "Ad owners can moderate comments on their ads." ON public.ad_comments;

DROP POLICY IF EXISTS "Avatars are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;

DROP POLICY IF EXISTS "Ad media is publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Advertisers can upload media for their ads." ON storage.objects;
DROP POLICY IF EXISTS "Advertisers can delete media from their ads." ON storage.objects;

--- PROFILES ---
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );

--- CATEGORIES & LOCATIONS (Public Data) ---
CREATE POLICY "Anyone can view public tables."
  ON public.categories FOR SELECT
  USING ( true );

CREATE POLICY "Anyone can view public tables."
  ON public.locations FOR SELECT
  USING ( true );

--- ADS ---
CREATE POLICY "Active ads are viewable by everyone."
  ON public.ads FOR SELECT
  USING ( status = 'active' );

CREATE POLICY "Advertisers can manage their own ads."
  ON public.ads FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADVERTISER' );

CREATE POLICY "Users can view their own non-active ads"
  ON public.ads FOR SELECT
  USING ( auth.uid() = user_id );

--- AD_MEDIA ---
CREATE POLICY "Ad media is viewable by everyone."
  ON public.ad_media FOR SELECT
  USING (
    (ad_id IN (SELECT id FROM ads WHERE status = 'active'))
    OR
    (auth.uid() = user_id)
  );

CREATE POLICY "Advertisers can manage media for their own ads."
  ON public.ad_media FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADVERTISER' );

--- AD_RATINGS ---
CREATE POLICY "Ratings are public."
  ON public.ad_ratings FOR SELECT
  USING ( true );
  
CREATE POLICY "Users can insert/update their own ratings."
  ON public.ad_ratings FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

--- AD_COMMENTS ---
CREATE POLICY "Approved comments are public."
  ON public.ad_comments FOR SELECT
  USING ( status = 'approved' );

CREATE POLICY "Users can manage their own comments."
  ON public.ad_comments FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Ad owners can moderate comments on their ads."
  ON public.ad_comments FOR UPDATE
  USING (
    (SELECT user_id FROM ads WHERE id = ad_id) = auth.uid()
  )
  WITH CHECK (
    (SELECT user_id FROM ads WHERE id = ad_id) = auth.uid()
  );


--- STORAGE: AVATARS ---
CREATE POLICY "Avatars are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.uid() IS NOT NULL );
  
CREATE POLICY "Anyone can update their own avatar."
  ON storage.objects FOR UPDATE
  USING ( auth.uid() = owner )
  WITH CHECK ( bucket_id = 'avatars' );


--- STORAGE: AD_MEDIA ---
CREATE POLICY "Ad media is publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'ad_media' );

CREATE POLICY "Advertisers can upload media for their ads."
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ad_media'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
  );

CREATE POLICY "Advertisers can delete media from their ads."
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ad_media'
    AND auth.uid() = owner
  );
