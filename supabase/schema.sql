
-- ### Tipos Personalizados ###

-- Drop el tipo si existe, para evitar errores en re-ejecuciones
DROP TYPE IF EXISTS public.user_role;
-- Rol del usuario en la plataforma
CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADVERTISER'
);

-- Drop el tipo si existe
DROP TYPE IF EXISTS public.ad_status;
-- Estado de un anuncio
CREATE TYPE public.ad_status AS ENUM (
    'active',
    'inactive',
    'draft',
    'expired'
);

-- Drop el tipo si existe
DROP TYPE IF EXISTS public.media_type;
-- Tipo de contenido multimedia
CREATE TYPE public.media_type AS ENUM (
    'image',
    'video'
);

-- Drop el tipo si existe
DROP TYPE IF EXISTS public.comment_status;
-- Estado de un comentario
CREATE TYPE public.comment_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- ### Tabla de Perfiles ###
-- Almacena datos públicos y de rol de los usuarios.
DROP TABLE IF EXISTS public.profiles;
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'USER',
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    country_id INT, -- Referencia al país del anunciante
    contact_email TEXT,
    contact_whatsapp TEXT,
    contact_telegram TEXT,
    contact_social_url TEXT,
    updated_at timestamptz
);

-- Comentarios en columnas de profiles
COMMENT ON COLUMN public.profiles.id IS 'Referencia a auth.users.id';
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario (USER o ADVERTISER)';
COMMENT ON COLUMN public.profiles.country_id IS 'ID del país de residencia del anunciante, para prefijo telefónico.';
COMMENT ON COLUMN public.profiles.contact_email IS 'Email de contacto público del anunciante.';
COMMENT ON COLUMN public.profiles.contact_whatsapp IS 'Número de WhatsApp sin prefijo.';
COMMENT ON COLUMN public.profiles.contact_telegram IS 'Nombre de usuario de Telegram.';
COMMENT ON COLUMN public.profiles.contact_social_url IS 'URL a una red social o web personal.';


-- ### Tablas Maestras ###

-- Tabla de Categorías para los anuncios
DROP TABLE IF EXISTS public.categories;
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Tabla de Ubicaciones (Países, Regiones, Ciudades)
DROP TABLE IF EXISTS public.locations;
CREATE TABLE public.locations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'country', 'region', 'subregion'
    parent_id INTEGER REFERENCES public.locations(id),
    code VARCHAR(10), -- ej. 'ES', 'US'
    phone_code VARCHAR(10) -- ej. '34', '1'
);


-- ### Tabla de Anuncios ###
-- Contiene todos los anuncios clasificados.
DROP TABLE IF EXISTS public.ads;
CREATE TABLE public.ads (
    id BIGSERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES public.categories(id),
    country_id INTEGER REFERENCES public.locations(id),
    region_id INTEGER REFERENCES public.locations(id),
    subregion_id INTEGER REFERENCES public.locations(id),
    tags text[] NULL,
    status ad_status NOT NULL DEFAULT 'draft',
    boosted_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);
CREATE INDEX ON public.ads (user_id);
CREATE INDEX ON public.ads (category_id);
CREATE INDEX ON public.ads (status);
CREATE INDEX ON public.ads (country_id, region_id, subregion_id);
-- Índice GIN para búsqueda eficiente en el array de tags
CREATE INDEX ads_tags_idx ON public.ads USING gin (tags);


-- ### Tablas Relacionadas a Anuncios ###

-- Contenido multimedia de los anuncios (imágenes y videos)
DROP TABLE IF EXISTS public.ad_media;
CREATE TABLE public.ad_media (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type media_type NOT NULL,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ad_media (ad_id);

-- Calificaciones de los anuncios
DROP TABLE IF EXISTS public.ad_ratings;
CREATE TABLE public.ad_ratings (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(ad_id, user_id) -- Un usuario solo puede calificar un anuncio una vez
);
CREATE INDEX ON public.ad_ratings (ad_id);

-- Comentarios en los anuncios
DROP TABLE IF EXISTS public.ad_comments;
CREATE TABLE public.ad_comments (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ad_comments (ad_id);


-- ### Automatización (Triggers y Funciones) ###

-- Función para crear un perfil cuando un usuario se registra
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
    (new.raw_user_meta_data->>'role')::public.user_role
  );
  RETURN new;
END;
$$;

-- Trigger que ejecuta la función después de la inserción en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ### Políticas de Seguridad (Row Level Security) ###

-- Activar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- --- Políticas para `profiles` ---
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

-- --- Políticas para `categories` y `locations` (Tablas maestras públicas) ---
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone."
ON public.categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Locations are viewable by everyone." ON public.locations;
CREATE POLICY "Locations are viewable by everyone."
ON public.locations FOR SELECT
USING (true);

-- --- Políticas para `ads` ---
DROP POLICY IF EXISTS "Ads are viewable by everyone." ON public.ads;
CREATE POLICY "Ads are viewable by everyone."
ON public.ads FOR SELECT
USING (true); -- Cualquiera puede ver cualquier anuncio, el estado se filtra en el front-end

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
WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Advertisers can delete their own ads." ON public.ads;
CREATE POLICY "Advertisers can delete their own ads."
ON public.ads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- --- Políticas para `ad_media` ---
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

-- --- Políticas para `ad_ratings` ---
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
    user_id <> (SELECT ad.user_id FROM public.ads ad WHERE ad.id = ad_id) -- No puede calificar su propio anuncio
);

DROP POLICY IF EXISTS "Users can update their own rating." ON public.ad_ratings;
CREATE POLICY "Users can update their own rating."
ON public.ad_ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- --- Políticas para `ad_comments` ---
DROP POLICY IF EXISTS "Approved comments are public." ON public.ad_comments;
CREATE POLICY "Approved comments are public."
ON public.ad_comments FOR SELECT
USING (status = 'approved');

DROP POLICY IF EXISTS "Users can see their own pending comments." ON public.ad_comments;
CREATE POLICY "Users can see their own pending comments."
ON public.ad_comments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can see all comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can see all comments on their ads."
ON public.ad_comments FOR SELECT
TO authenticated
USING (
    (SELECT ad.user_id FROM public.ads ad WHERE ad.id = ad_id) = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated users can create comments." ON public.ad_comments;
CREATE POLICY "Authenticated users can create comments."
ON public.ad_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments." ON public.ad_comments;
CREATE POLICY "Users can delete their own comments."
ON public.ad_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can moderate comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can moderate comments on their ads."
ON public.ad_comments FOR UPDATE
TO authenticated
USING (
    (SELECT ad.user_id FROM public.ads ad WHERE ad.id = ad_id) = auth.uid()
)
WITH CHECK (
    (SELECT ad.user_id FROM public.ads ad WHERE ad.id = ad_id) = auth.uid()
);

-- ### Almacenamiento (Storage) ###

-- Bucket para avatares de usuario
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para imágenes y videos de anuncios
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad_media', 'ad_media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para el bucket de avatares
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar."
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;
CREATE POLICY "Anyone can update their own avatar."
ON storage.objects FOR UPDATE
USING (auth.uid() = owner)
WITH CHECK (bucket_id = 'avatars');

-- Políticas de seguridad para el bucket de ad_media
DROP POLICY IF EXISTS "Ad media files are publicly accessible." ON storage.objects;
CREATE POLICY "Ad media files are publicly accessible."
ON storage.objects FOR SELECT
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


-- ### Inserción de Datos Maestros ###

-- Insertar algunas categorías de ejemplo
INSERT INTO public.categories (name) VALUES
('Scorts'),
('Chicas Trans'),
('Scorts Gay'),
('Servicios Virtuales')
ON CONFLICT (name) DO NOTHING;

-- Insertar ubicaciones de ejemplo (Colombia y España)
-- Países
INSERT INTO public.locations (id, name, type, code, phone_code) VALUES
(1, 'Colombia', 'country', 'CO', '57'),
(2, 'España', 'country', 'ES', '34')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, code = EXCLUDED.code, phone_code = EXCLUDED.phone_code;

-- Regiones/Provincias
INSERT INTO public.locations (id, name, type, parent_id) VALUES
(101, 'Antioquia', 'region', 1),
(102, 'Comunidad de Madrid', 'region', 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, parent_id = EXCLUDED.parent_id;

-- Subregiones/Ciudades
INSERT INTO public.locations (id, name, type, parent_id) VALUES
(10101, 'Medellín', 'subregion', 101),
(10201, 'Madrid', 'subregion', 102)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, parent_id = EXCLUDED.parent_id;

-- Reiniciar la secuencia de IDs para evitar conflictos con inserciones manuales
SELECT setval('public.locations_id_seq', (SELECT MAX(id) FROM public.locations));
