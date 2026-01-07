
-- ### Tipos ###
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADVERTISER'
);

DROP TYPE IF EXISTS public.ad_status CASCADE;
CREATE TYPE public.ad_status AS ENUM (
    'active',
    'inactive',
    'draft',
    'expired'
);

DROP TYPE IF EXISTS public.comment_status CASCADE;
CREATE TYPE public.comment_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- ### Tablas ###

-- Perfiles de Usuario
CREATE TABLE IF NOT EXISTS public.profiles (
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
    contact_social_url text
);

-- Categorías para los anuncios
CREATE TABLE IF NOT EXISTS public.categories (
    id bigserial PRIMARY KEY,
    name text NOT NULL UNIQUE
);

-- Ubicaciones (Países, Regiones, Ciudades)
CREATE TABLE IF NOT EXISTS public.locations (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL, -- 'country', 'region', 'subregion'
    parent_id bigint REFERENCES public.locations(id),
    code text, -- ej. 'ES' para España
    phone_code text -- ej. '34' para España
);

-- Anuncios
CREATE TABLE IF NOT EXISTS public.ads (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    category_id bigint REFERENCES public.categories(id),
    country_id bigint REFERENCES public.locations(id),
    region_id bigint REFERENCES public.locations(id),
    subregion_id bigint REFERENCES public.locations(id),
    status ad_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    boosted_until timestamptz,
    slug text UNIQUE NOT NULL,
    tags text[]
);
CREATE INDEX IF NOT EXISTS ads_gin_tags_idx ON public.ads USING GIN (tags);
CREATE INDEX IF NOT EXISTS ads_title_fts_idx ON public.ads USING GIN (to_tsvector('spanish', title));


-- Contenido multimedia de los anuncios (imágenes/videos)
CREATE TABLE IF NOT EXISTS public.ad_media (
    id bigserial PRIMARY KEY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url text NOT NULL,
    type text NOT NULL DEFAULT 'image', -- 'image' o 'video'
    is_cover boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Calificaciones de anuncios
CREATE TABLE IF NOT EXISTS public.ad_ratings (
    id bigserial PRIMARY KEY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (ad_id, user_id) -- Un usuario solo puede calificar un anuncio una vez
);

-- Comentarios en anuncios
CREATE TABLE IF NOT EXISTS public.ad_comments (
    id bigserial PRIMARY KEY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment text NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);


-- ### Trigger para creación automática de perfiles ###
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
  return new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ### Almacenamiento (Storage) ###
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ad_media', 'ad_media', true)
ON CONFLICT (id) DO NOTHING;


-- ### Políticas de Seguridad (RLS) ###

-- Habilitar RLS para todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para `profiles`
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para `categories` y `locations` (datos maestros públicos)
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone." ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Locations are viewable by everyone." ON public.locations;
CREATE POLICY "Locations are viewable by everyone." ON public.locations FOR SELECT USING (true);

-- Políticas para `ads`
DROP POLICY IF EXISTS "Ads are viewable by everyone." ON public.ads;
CREATE POLICY "Ads are viewable by everyone." ON public.ads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Advertisers can create ads." ON public.ads;
CREATE POLICY "Advertisers can create ads." ON public.ads FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
);
DROP POLICY IF EXISTS "Advertisers can update their own ads." ON public.ads;
CREATE POLICY "Advertisers can update their own ads." ON public.ads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Advertisers can delete their own ads." ON public.ads;
CREATE POLICY "Advertisers can delete their own ads." ON public.ads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas para `ad_media`
DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
CREATE POLICY "Ad media is viewable by everyone." ON public.ad_media FOR SELECT USING (true);
DROP POLICY IF EXISTS "Advertisers can insert media for their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can insert media for their own ads." ON public.ad_media FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    (EXISTS (SELECT 1 FROM ads WHERE ads.id = ad_id AND ads.user_id = auth.uid()))
);
DROP POLICY IF EXISTS "Advertisers can delete media from their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can delete media from their own ads." ON public.ad_media FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas para `ad_ratings`
DROP POLICY IF EXISTS "Ratings are viewable by everyone." ON public.ad_ratings;
CREATE POLICY "Ratings are viewable by everyone." ON public.ad_ratings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create ratings." ON public.ad_ratings;
CREATE POLICY "Authenticated users can create ratings." ON public.ad_ratings FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    -- Un usuario no puede calificar su propio anuncio
    NOT EXISTS (SELECT 1 FROM ads WHERE ads.id = ad_id AND ads.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can update their own rating." ON public.ad_ratings;
CREATE POLICY "Users can update their own rating." ON public.ad_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);


-- Políticas para `ad_comments`
DROP POLICY IF EXISTS "Approved comments are viewable by everyone." ON public.ad_comments;
CREATE POLICY "Approved comments are viewable by everyone." ON public.ad_comments FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "Users can view their own pending/rejected comments." ON public.ad_comments;
CREATE POLICY "Users can view their own pending/rejected comments." ON public.ad_comments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Advertisers can view all comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can view all comments on their ads." ON public.ad_comments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM ads WHERE ads.id = ad_comments.ad_id AND ads.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Authenticated users can create comments." ON public.ad_comments;
CREATE POLICY "Authenticated users can create comments." ON public.ad_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own comments." ON public.ad_comments;
CREATE POLICY "Users can delete their own comments." ON public.ad_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Advertisers can moderate comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can moderate comments on their ads." ON public.ad_comments FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM ads WHERE ads.id = ad_comments.ad_id AND ads.user_id = auth.uid())
) WITH CHECK (
    -- El anunciante solo puede cambiar el 'status', no el comentario en si
    auth.uid() != user_id
);

-- Políticas para Storage `avatars`
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;
CREATE POLICY "Anyone can update their own avatar." ON storage.objects FOR UPDATE USING (auth.uid() = owner) WITH CHECK (bucket_id = 'avatars');

-- Políticas para Storage `ad_media`
DROP POLICY IF EXISTS "Ad media is publicly accessible." ON storage.objects;
CREATE POLICY "Ad media is publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'ad_media');
DROP POLICY IF EXISTS "Advertisers can upload media." ON storage.objects;
CREATE POLICY "Advertisers can upload media." ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'ad_media' AND 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
);
DROP POLICY IF EXISTS "Advertisers can update their own media." ON storage.objects;
CREATE POLICY "Advertisers can update their own media." ON storage.objects FOR UPDATE TO authenticated USING (auth.uid() = owner) WITH CHECK (bucket_id = 'ad_media');
DROP POLICY IF EXISTS "Advertisers can delete their own media." ON storage.objects;
CREATE POLICY "Advertisers can delete their own media." ON storage.objects FOR DELETE TO authenticated USING (auth.uid() = owner);


-- ### Datos Iniciales (Seed Data) ###

-- Insertar categorías si no existen
INSERT INTO public.categories (name) VALUES
('Scorts'),
('Chicas Trans'),
('Scorts Gay'),
('Servicios Virtuales')
ON CONFLICT (name) DO NOTHING;

-- Insertar ubicaciones de ejemplo si la tabla está vacía
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM public.locations) THEN
      -- Países
      INSERT INTO public.locations (id, name, type, code, phone_code) VALUES
      (1, 'Colombia', 'country', 'CO', '57'),
      (2, 'España', 'country', 'ES', '34')
      ON CONFLICT (id) DO NOTHING;

      -- Regiones
      INSERT INTO public.locations (id, name, type, parent_id) VALUES
      (10, 'Antioquia', 'region', 1),
      (11, 'Comunidad de Madrid', 'region', 2)
      ON CONFLICT (id) DO NOTHING;

      -- Subregiones/Ciudades
      INSERT INTO public.locations (id, name, type, parent_id) VALUES
      (100, 'Medellín', 'subregion', 10),
      (101, 'Madrid', 'subregion', 11)
      ON CONFLICT (id) DO NOTHING;

      -- Reset sequence to avoid conflicts with manual inserts
      PERFORM setval('public.locations_id_seq', (SELECT MAX(id) FROM public.locations));
   END IF;
END
$$;
