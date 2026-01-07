-- ----------------------------
-- DEFINICIÓN DE TIPOS ENUM
-- ----------------------------
DROP TYPE IF EXISTS public.user_role;
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');

DROP TYPE IF EXISTS public.ad_status;
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');

DROP TYPE IF EXISTS public.comment_status;
CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected');

-- ----------------------------
-- TABLAS
-- ----------------------------

-- Tabla de Categorías
DROP TABLE IF EXISTS public.categories CASCADE;
CREATE TABLE public.categories (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL UNIQUE
);

-- Tabla de Ubicaciones (Países, Regiones, Subregiones)
DROP TABLE IF EXISTS public.locations CASCADE;
CREATE TABLE public.locations (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    type text NOT NULL, -- 'country', 'region', 'subregion'
    parent_id integer REFERENCES public.locations(id),
    code varchar(10) NULL,
    phone_code varchar(10) NULL
);

-- Tabla de Perfiles
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'USER',
  full_name text,
  updated_at timestamptz,
  -- Campos de contacto para anunciantes
  country_id integer REFERENCES public.locations(id),
  contact_email text,
  contact_whatsapp text,
  contact_telegram text,
  contact_social_url text,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Tabla de Anuncios
DROP TABLE IF EXISTS public.ads CASCADE;
CREATE TABLE public.ads (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text NOT NULL,
    category_id integer NOT NULL REFERENCES public.categories(id),
    country_id integer REFERENCES public.locations(id),
    region_id integer REFERENCES public.locations(id),
    subregion_id integer REFERENCES public.locations(id),
    status ad_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    boosted_until timestamptz,
    tags text[] NULL
);

-- Tabla de Multimedia de Anuncios (Imágenes/Videos)
DROP TABLE IF EXISTS public.ad_media CASCADE;
CREATE TABLE public.ad_media (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url text NOT NULL,
    type text NOT NULL, -- 'image' or 'video'
    is_cover boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla de Calificaciones de Anuncios
DROP TABLE IF EXISTS public.ad_ratings CASCADE;
CREATE TABLE public.ad_ratings (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (ad_id, user_id) -- Un usuario solo puede calificar un anuncio una vez
);

-- Tabla de Comentarios de Anuncios
DROP TABLE IF EXISTS public.ad_comments CASCADE;
CREATE TABLE public.ad_comments (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment text NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------
-- TRIGGERS
-- ----------------------------
-- Función para insertar una fila en public.profiles al crear un usuario en auth.users
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

-- Trigger que ejecuta la función cada vez que se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ----------------------------
-- STORAGE BUCKETS
-- ----------------------------
-- Bucket para avatares de perfil
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para imágenes y videos de anuncios
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad_media', 'ad_media', true)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ----------------------------

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;

-- ------ Políticas para la tabla PROFILES ------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
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


-- ------ Políticas para la tabla ADS ------
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


-- ------ Políticas para la tabla AD_MEDIA ------
DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
CREATE POLICY "Ad media is viewable by everyone."
ON public.ad_media FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Advertisers can add media to their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can add media to their own ads."
ON public.ad_media FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
);

DROP POLICY IF EXISTS "Advertisers can delete media from their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can delete media from their own ads."
ON public.ad_media FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ------ Políticas para CATEGORIES y LOCATIONS (Solo lectura para todos) ------
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone."
ON public.categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Locations are viewable by everyone." ON public.locations;
CREATE POLICY "Locations are viewable by everyone."
ON public.locations FOR SELECT
USING (true);

-- ------ Políticas para AD_RATINGS ------
DROP POLICY IF EXISTS "Ratings are viewable by everyone." ON public.ad_ratings;
CREATE POLICY "Ratings are viewable by everyone."
ON public.ad_ratings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can rate ads." ON public.ad_ratings;
CREATE POLICY "Authenticated users can rate ads."
ON public.ad_ratings FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    (SELECT user_id FROM ads WHERE id = ad_id) <> auth.uid() -- No puede calificar su propio anuncio
);

DROP POLICY IF EXISTS "Users can update their own rating." ON public.ad_ratings;
CREATE POLICY "Users can update their own rating."
ON public.ad_ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ------ Políticas para AD_COMMENTS ------
DROP POLICY IF EXISTS "Public can see approved comments." ON public.ad_comments;
CREATE POLICY "Public can see approved comments."
ON public.ad_comments FOR SELECT
USING (status = 'approved');

DROP POLICY IF EXISTS "Users can see their own comments." ON public.ad_comments;
CREATE POLICY "Users can see their own comments."
ON public.ad_comments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can see all comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can see all comments on their ads."
ON public.ad_comments FOR SELECT
TO authenticated
USING ((SELECT user_id FROM ads WHERE id = ad_id) = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create comments." ON public.ad_comments;
CREATE POLICY "Authenticated users can create comments."
ON public.ad_comments FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    (SELECT user_id FROM ads WHERE id = ad_id) <> auth.uid() -- No puede comentar su propio anuncio
);

DROP POLICY IF EXISTS "Advertisers can moderate comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can moderate comments on their ads."
ON public.ad_comments FOR UPDATE
TO authenticated
USING ((SELECT user_id FROM ads WHERE id = ad_id) = auth.uid())
WITH CHECK ((SELECT user_id FROM ads WHERE id = ad_id) = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments." ON public.ad_comments;
CREATE POLICY "Users can delete their own comments."
ON public.ad_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ----------------------------
-- POLÍTICAS DE ACCESO A STORAGE
-- ----------------------------
-- ------ Políticas para el bucket AVATARS ------
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar."
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar."
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'avatars');

-- ------ Políticas para el bucket AD_MEDIA ------
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
    auth.uid() = owner AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
);

DROP POLICY IF EXISTS "Advertisers can delete their own ad media." ON storage.objects;
CREATE POLICY "Advertisers can delete their own ad media."
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ad_media' AND
    auth.uid() = owner
);

-- ----------------------------
-- INSERCIÓN DE DATOS INICIALES (OPCIONAL)
-- ----------------------------
-- Insertar categorías
INSERT INTO public.categories(name) VALUES
('Scorts'),
('Chicas Trans'),
('Scorts Gay'),
('Servicios Virtuales')
ON CONFLICT (name) DO NOTHING;

-- Insertar países (Ejemplo para España y Colombia)
INSERT INTO public.locations(name, type, code, phone_code) VALUES
('España', 'country', 'ES', '34'),
('Colombia', 'country', 'CO', '57')
ON CONFLICT (name) DO NOTHING;

-- Insertar regiones (Ejemplo para España)
INSERT INTO public.locations(name, type, parent_id)
SELECT 'Madrid', 'region', id FROM public.locations WHERE name = 'España' AND type = 'country'
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.locations(name, type, parent_id)
SELECT 'Cataluña', 'region', id FROM public.locations WHERE name = 'España' AND type = 'country'
ON CONFLICT (name) DO NOTHING;

-- Insertar subregiones/ciudades (Ejemplo para Madrid)
INSERT INTO public.locations(name, type, parent_id)
SELECT 'Madrid', 'subregion', id FROM public.locations WHERE name = 'Madrid' AND type = 'region'
ON CONFLICT (name) DO NOTHING;
INSERT INTO public.locations(name, type, parent_id)
SELECT 'Barcelona', 'subregion', id FROM public.locations WHERE name = 'Cataluña' AND type = 'region'
ON CONFLICT (name) DO NOTHING;

