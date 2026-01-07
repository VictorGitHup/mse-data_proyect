-- Tipos ENUM para roles y estados
DROP TYPE IF EXISTS public.user_role;
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');

DROP TYPE IF EXISTS public.ad_status;
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');

DROP TYPE IF EXISTS public.ad_media_type;
CREATE TYPE public.ad_media_type AS ENUM ('image', 'video');

DROP TYPE IF EXISTS public.comment_status;
CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected');


-- Creación de la tabla de ubicaciones (país, región, subregión)
CREATE TABLE IF NOT EXISTS public.locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'country', 'region', 'subregion'
    parent_id INTEGER REFERENCES public.locations(id),
    code VARCHAR(10),
    phone_code VARCHAR(10)
);


-- Creación de la tabla de categorías
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);


-- Creación de la tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'USER',
  updated_at TIMESTAMPTZ,
  country_id INTEGER REFERENCES public.locations(id),
  contact_email TEXT,
  contact_whatsapp TEXT,
  contact_telegram TEXT,
  contact_social_url TEXT,

  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Creación de la tabla de anuncios (ads)
CREATE TABLE IF NOT EXISTS public.ads (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES public.categories(id),
    country_id INTEGER REFERENCES public.locations(id),
    region_id INTEGER REFERENCES public.locations(id),
    subregion_id INTEGER REFERENCES public.locations(id),
    status ad_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    boosted_until TIMESTAMPTZ,
    slug TEXT NOT NULL UNIQUE,
    tags TEXT[]
);

-- Creación de la tabla de media de anuncios (imágenes/videos)
CREATE TABLE IF NOT EXISTS public.ad_media (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type ad_media_type NOT NULL,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creación de la tabla de calificaciones (ratings)
CREATE TABLE IF NOT EXISTS public.ad_ratings (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ad_id, user_id) -- Un usuario solo puede calificar un anuncio una vez
);

-- Creación de la tabla de comentarios (comments)
CREATE TABLE IF NOT EXISTS public.ad_comments (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Función y Trigger para crear un perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Almacenamiento (Storage)
-- Bucket para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 5242880, '{"image/jpeg","image/png","image/webp"}')
ON CONFLICT (id) DO NOTHING;

-- Bucket para media de anuncios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ad_media', 'ad_media', TRUE, 52428800, '{"image/jpeg","image/png","image/webp","video/mp4","video/quicktime"}')
ON CONFLICT (id) DO NOTHING;


-- Políticas de Seguridad a Nivel de Fila (RLS)

-- Tabla: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

-- Tabla: locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Locations are viewable by everyone." ON public.locations;
CREATE POLICY "Locations are viewable by everyone." ON public.locations FOR SELECT USING (true);

-- Tabla: categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone." ON public.categories FOR SELECT USING (true);

-- Tabla: ads
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ads are viewable by everyone." ON public.ads;
CREATE POLICY "Ads are viewable by everyone." ON public.ads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Advertisers can create their own ads." ON public.ads;
CREATE POLICY "Advertisers can create their own ads." ON public.ads FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id) AND
  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER')
);

DROP POLICY IF EXISTS "Advertisers can update their own ads." ON public.ads;
CREATE POLICY "Advertisers can update their own ads." ON public.ads FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id))
WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Advertisers can delete their own ads." ON public.ads;
CREATE POLICY "Advertisers can delete their own ads." ON public.ads FOR DELETE
TO authenticated
USING ((auth.uid() = user_id));

-- Tabla: ad_media
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
CREATE POLICY "Ad media is viewable by everyone." ON public.ad_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "Advertisers can create media for their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can create media for their own ads." ON public.ad_media FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id) AND
  (EXISTS (SELECT 1 FROM public.ads WHERE id = ad_id AND user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Advertisers can delete media from their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can delete media from their own ads." ON public.ad_media FOR DELETE
TO authenticated
USING ((auth.uid() = user_id));


-- Tabla: ad_ratings
ALTER TABLE public.ad_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ratings are viewable by everyone." ON public.ad_ratings;
CREATE POLICY "Ratings are viewable by everyone." ON public.ad_ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create ratings." ON public.ad_ratings;
CREATE POLICY "Authenticated users can create ratings." ON public.ad_ratings FOR INSERT
TO authenticated
WITH CHECK (
    (auth.uid() = user_id) AND
    (NOT EXISTS (SELECT 1 FROM public.ads WHERE id = ad_id AND user_id = auth.uid())) -- No puede calificar su propio anuncio
);

DROP POLICY IF EXISTS "Users can update their own ratings." ON public.ad_ratings;
CREATE POLICY "Users can update their own ratings." ON public.ad_ratings FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id))
WITH CHECK ((auth.uid() = user_id));


-- Tabla: ad_comments
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can see approved comments." ON public.ad_comments;
CREATE POLICY "Public can see approved comments." ON public.ad_comments FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Users can see their own comments." ON public.ad_comments;
CREATE POLICY "Users can see their own comments." ON public.ad_comments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can see all comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can see all comments on their ads." ON public.ad_comments FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.ads WHERE id = ad_comments.ad_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create comments." ON public.ad_comments;
CREATE POLICY "Authenticated users can create comments." ON public.ad_comments FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can delete their own comments." ON public.ad_comments;
CREATE POLICY "Users can delete their own comments." ON public.ad_comments FOR DELETE
TO authenticated
USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Advertisers can moderate comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can moderate comments on their ads." ON public.ad_comments FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.ads WHERE id = ad_comments.ad_id AND user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.ads WHERE id = ad_comments.ad_id AND user_id = auth.uid()));


-- Políticas de Almacenamiento (Storage RLS)
-- Bucket: avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;
CREATE POLICY "Anyone can update their own avatar." ON storage.objects FOR UPDATE USING ((auth.uid() = owner)) WITH CHECK (bucket_id = 'avatars');

-- Bucket: ad_media
DROP POLICY IF EXISTS "Ad media is publicly accessible." ON storage.objects;
CREATE POLICY "Ad media is publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'ad_media');

DROP POLICY IF EXISTS "Advertisers can upload media to their own folder." ON storage.objects;
CREATE POLICY "Advertisers can upload media to their own folder." ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ad_media' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER')
);

DROP POLICY IF EXISTS "Advertisers can delete media from their own folder." ON storage.objects;
CREATE POLICY "Advertisers can delete media from their own folder." ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ad_media' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- DUMMY DATA --
INSERT INTO public.categories (name) VALUES
('Scorts'),
('Chicas Trans'),
('Scorts Gay'),
('Servicios Virtuales')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locations (id, name, type, parent_id, code, phone_code) VALUES
(1, 'España', 'country', NULL, 'ES', '34'),
(100, 'Colombia', 'country', NULL, 'CO', '57'),
(101, 'Antioquia', 'region', 100, 'ANT', NULL),
(102, 'Medellín', 'subregion', 101, 'MED', NULL),
(103, 'Cundinamarca', 'region', 100, 'CUN', NULL),
(104, 'Bogotá', 'subregion', 103, 'BOG', NULL),
(105, 'Valle del Cauca', 'region', 100, 'VAC', NULL),
(106, 'Cali', 'subregion', 105, 'CAL', NULL)
ON CONFLICT (id) DO NOTHING;

