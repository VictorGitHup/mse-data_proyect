
-- ### TIPOS PERSONALIZADOS ###
-- Elimina los tipos existentes si existen para evitar errores en ejecuciones repetidas.
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.ad_status;
DROP TYPE IF EXISTS public.comment_status;

-- Creación de los tipos ENUM para roles, estado de anuncios y estado de comentarios.
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');
CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected');


-- ### TABLA DE PERFILES ###
-- Almacena información pública y de rol de los usuarios.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'USER',
  country_id int REFERENCES public.locations(id),
  contact_email text,
  contact_whatsapp text,
  contact_telegram text,
  contact_social_url text,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Comentarios sobre la tabla y columnas de perfiles.
comment on table public.profiles is 'Profile data for each user.';
comment on column public.profiles.id is 'References the internal Supabase auth user.';
comment on column public.profiles.role is 'Specifies if the user is a standard user or an advertiser.';


-- ### TABLA DE CATEGORÍAS ###
-- Almacena las categorías de los anuncios.
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name text NOT NULL UNIQUE
);


-- ### TABLA DE UBICACIONES ###
-- Almacena países, regiones y subregiones.
CREATE TABLE IF NOT EXISTS public.locations (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL, -- 'country', 'region', 'subregion'
  parent_id integer REFERENCES public.locations(id),
  code text, -- e.g., 'US', 'ES'
  phone_code text -- e.g., '+1', '+34'
);


-- ### TABLA DE ANUNCIOS ###
-- Contiene todos los anuncios clasificados.
CREATE TABLE IF NOT EXISTS public.ads (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  category_id int NOT NULL REFERENCES public.categories(id),
  country_id int REFERENCES public.locations(id),
  region_id int REFERENCES public.locations(id),
  subregion_id int REFERENCES public.locations(id),
  status ad_status NOT NULL DEFAULT 'draft',
  tags text[] NULL,
  boosted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Índices para mejorar el rendimiento de las búsquedas.
CREATE INDEX IF NOT EXISTS idx_ads_user_id ON public.ads(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_location ON public.ads(country_id, region_id, subregion_id);
CREATE INDEX IF NOT EXISTS idx_ads_tags ON public.ads USING GIN (tags);


-- ### TABLA DE MULTIMEDIA DE ANUNCIOS ###
-- Almacena imágenes y videos asociados a los anuncios.
CREATE TABLE IF NOT EXISTS public.ad_media (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT NOT NULL, -- 'image' or 'video'
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para la tabla de multimedia.
CREATE INDEX IF NOT EXISTS idx_ad_media_ad_id ON public.ad_media(ad_id);


-- ### TABLA DE CALIFICACIONES DE ANUNCIOS ###
-- Almacena las calificaciones (1-5 estrellas) de los usuarios.
CREATE TABLE IF NOT EXISTS public.ad_ratings (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Un usuario solo puede calificar un anuncio una vez.
    UNIQUE (ad_id, user_id)
);

-- Índices para la tabla de calificaciones.
CREATE INDEX IF NOT EXISTS idx_ad_ratings_ad_id ON public.ad_ratings(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_ratings_user_id ON public.ad_ratings(user_id);


-- ### TABLA DE COMENTARIOS DE ANUNCIOS ###
-- Almacena los comentarios de los usuarios en los anuncios.
CREATE TABLE IF NOT EXISTS public.ad_comments (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para la tabla de comentarios.
CREATE INDEX IF NOT EXISTS idx_ad_comments_ad_id_status ON public.ad_comments(ad_id, status);


-- ### FUNCIÓN Y TRIGGER PARA CREAR PERFILES ###
-- Esta función se ejecuta automáticamente al registrar un nuevo usuario.
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

-- El trigger que invoca la función.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ### POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (RLS) ###

-- --- Políticas para la tabla 'profiles' ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- --- Políticas para la tabla 'ads' ---
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ads are viewable by everyone." ON public.ads;
CREATE POLICY "Ads are viewable by everyone."
ON public.ads FOR SELECT
TO public
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

-- --- Políticas para la tabla 'ad_media' ---
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
CREATE POLICY "Ad media is viewable by everyone."
ON public.ad_media FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Advertisers can manage media for their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can manage media for their own ads."
ON public.ad_media FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- --- Políticas para la tabla 'ad_ratings' ---
ALTER TABLE public.ad_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings are public." ON public.ad_ratings;
CREATE POLICY "Ratings are public."
ON public.ad_ratings FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Authenticated users can rate ads." ON public.ad_ratings;
CREATE POLICY "Authenticated users can rate ads."
ON public.ad_ratings FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND
    -- El anunciante no puede calificar su propio anuncio.
    (SELECT user_id FROM public.ads WHERE id = ad_id) <> auth.uid()
);

DROP POLICY IF EXISTS "Users can update their own rating." ON public.ad_ratings;
CREATE POLICY "Users can update their own rating."
ON public.ad_ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rating." ON public.ad_ratings;
CREATE POLICY "Users can delete their own rating."
ON public.ad_ratings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- --- Políticas para la tabla 'ad_comments' ---
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can see approved comments." ON public.ad_comments;
CREATE POLICY "Public can see approved comments."
ON public.ad_comments FOR SELECT
TO public
USING (status = 'approved');

DROP POLICY IF EXISTS "Advertisers can see all comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can see all comments on their ads."
ON public.ad_comments FOR SELECT
TO authenticated
USING ((SELECT user_id FROM public.ads WHERE id = ad_comments.ad_id) = auth.uid());

DROP POLICY IF EXISTS "Users can see their own comments." ON public.ad_comments;
CREATE POLICY "Users can see their own comments."
ON public.ad_comments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create comments." ON public.ad_comments;
CREATE POLICY "Authenticated users can create comments."
ON public.ad_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Advertisers can moderate comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can moderate comments on their ads."
ON public.ad_comments FOR UPDATE
TO authenticated
USING ((SELECT user_id FROM public.ads WHERE id = ad_comments.ad_id) = auth.uid())
WITH CHECK (
    -- El anunciante solo puede cambiar el estado, no el texto del comentario.
    (SELECT user_id FROM public.ads WHERE id = ad_comments.ad_id) = auth.uid() AND
    (SELECT comment FROM public.ad_comments WHERE id = ad_comments.id) = comment
);

DROP POLICY IF EXISTS "Users can delete their own comments." ON public.ad_comments;
CREATE POLICY "Users can delete their own comments."
ON public.ad_comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ### ALMACENAMIENTO (STORAGE) ###
-- Bucket para los avatares de los usuarios.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket 'avatars'.
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
TO public
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


-- Bucket para imágenes y videos de anuncios.
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad_media', 'ad_media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para el bucket 'ad_media'.
DROP POLICY IF EXISTS "Ad media is publicly accessible." ON storage.objects;
CREATE POLICY "Ad media is publicly accessible."
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad_media');

DROP POLICY IF EXISTS "Advertisers can upload media." ON storage.objects;
CREATE POLICY "Advertisers can upload media."
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ad_media' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
);

DROP POLICY IF EXISTS "Advertisers can update their own media." ON storage.objects;
CREATE POLICY "Advertisers can update their own media."
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'ad_media');

DROP POLICY IF EXISTS "Advertisers can delete their own media." ON storage.objects;
CREATE POLICY "Advertisers can delete their own media."
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);
