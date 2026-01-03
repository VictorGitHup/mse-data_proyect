-- Plataforma de Anuncios Clasificados - Esquema de Base de Datos Supabase
-- Versión: 1.0
-- Este script configura las tablas, roles, almacenamiento y políticas de seguridad.

-- 1. TIPOS PERSONALIZADOS (ENUMS)
--==================================================

-- Creamos un tipo para los roles de usuario.
-- Esto asegura que un perfil solo pueda tener uno de estos dos roles.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');
    END IF;
END$$;

-- Creamos un tipo para el estado de los anuncios.
-- Esto asegura que un anuncio solo pueda tener uno de estos estados.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ad_status') THEN
        CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');
    END IF;
END$$;


-- 2. TABLAS
--==================================================

-- Tabla de perfiles de usuario.
-- Almacena datos públicos que no están en `auth.users`.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  role user_role DEFAULT 'USER'::public.user_role,

  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
COMMENT ON TABLE public.profiles IS 'Almacena el perfil público de los usuarios.';

-- Tabla de categorías para los anuncios.
CREATE TABLE IF NOT EXISTS public.categories (
  id smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text UNIQUE NOT NULL
);
COMMENT ON TABLE public.categories IS 'Almacena las categorías de los anuncios.';

-- Tabla de ubicaciones (países, regiones, subregiones).
-- Usamos una estructura de auto-referencia con `parent_id`.
CREATE TABLE IF NOT EXISTS public.locations (
  id int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  type text NOT NULL, -- 'country', 'region', 'subregion'
  parent_id int REFERENCES public.locations(id),
  code text -- Opcional, para códigos como 'MX', 'JAL', etc.
);
COMMENT ON TABLE public.locations IS 'Almacena ubicaciones jerárquicas (países, regiones, etc).';

-- Tabla principal de anuncios.
CREATE TABLE IF NOT EXISTS public.ads (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  category_id smallint NOT NULL REFERENCES public.categories(id),
  country_id int REFERENCES public.locations(id),
  region_id int REFERENCES public.locations(id),
  subregion_id int REFERENCES public.locations(id),
  slug text UNIQUE,
  status ad_status DEFAULT 'draft'::public.ad_status,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
COMMENT ON TABLE public.ads IS 'Contiene todos los anuncios publicados por los usuarios.';

-- Crear índices para mejorar el rendimiento de las búsquedas frecuentes.
CREATE INDEX IF NOT EXISTS ads_user_id_idx ON public.ads (user_id);
CREATE INDEX IF NOT EXISTS ads_location_idx ON public.ads (country_id, region_id, subregion_id);
CREATE INDEX IF NOT EXISTS locations_parent_id_idx ON public.locations (parent_id);


-- 3. FUNCIÓN Y TRIGGER PARA CREACIÓN DE PERFILES
--==================================================

-- Esta función se ejecuta automáticamente cada vez que un nuevo usuario se registra.
-- Inserta una fila en `public.profiles` usando los metadatos del registro.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- La función se ejecuta con los permisos del que la creó (el admin).
SET search_path = public
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

-- Creamos el trigger que llama a la función `handle_new_user`
-- después de que se inserte un nuevo usuario en la tabla `auth.users`.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. CONFIGURACIÓN DEL ALMACENAMIENTO (STORAGE)
--==================================================

-- Creamos el bucket para los avatares de los usuarios.
-- Hacemos el bucket público para que las imágenes se puedan ver sin autenticación.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
COMMENT ON BUCKET avatars IS 'Almacena las fotos de perfil de los usuarios.';

-- Creamos el bucket para las imágenes de los anuncios.
-- También lo hacemos público.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ad_images', 'ad_images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
COMMENT ON BUCKET ad_images IS 'Almacena las imágenes de los anuncios.';


-- 5. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
--==================================================

-- Habilitamos RLS en todas las tablas.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Eliminamos políticas existentes para evitar conflictos.
DROP POLICY IF EXISTS "Los perfiles públicos son visibles para todos." ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil." ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil." ON public.profiles;
DROP POLICY IF EXISTS "Todos pueden ver categorías y ubicaciones." ON public.categories;
DROP POLICY IF EXISTS "Todos pueden ver categorías y ubicaciones." ON public.locations;
DROP POLICY IF EXISTS "Los anuncios activos son visibles para todos." ON public.ads;
DROP POLICY IF EXISTS "Los usuarios pueden crear anuncios." ON public.ads;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios anuncios." ON public.ads;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios anuncios." ON public.ads;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios anuncios inactivos." ON public.ads;

-- Políticas para la tabla `profiles`
CREATE POLICY "Los perfiles públicos son visibles para todos." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Los usuarios pueden insertar su propio perfil." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Los usuarios pueden actualizar su propio perfil." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para tablas maestras `categories` y `locations`
CREATE POLICY "Todos pueden ver categorías y ubicaciones." ON public.categories FOR SELECT USING (true);
CREATE POLICY "Todos pueden ver categorías y ubicaciones." ON public.locations FOR SELECT USING (true);

-- Políticas para la tabla `ads`
CREATE POLICY "Los anuncios activos son visibles para todos." ON public.ads FOR SELECT USING (status = 'active');
CREATE POLICY "Los anunciantes pueden crear anuncios." ON public.ads FOR INSERT WITH CHECK (auth.uid() = user_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER');
CREATE POLICY "Los usuarios pueden actualizar sus propios anuncios." ON public.ads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden eliminar sus propios anuncios." ON public.ads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden ver sus propios anuncios inactivos." ON public.ads FOR SELECT USING (auth.uid() = user_id);


-- Políticas para el Almacenamiento (Storage)
DROP POLICY IF EXISTS "Los usuarios pueden subir avatares" ON storage.objects;
DROP POLICY IF EXISTS "Cualquiera puede ver avatares" ON storage.objects;
DROP POLICY IF EXISTS "Los usuarios pueden gestionar las imágenes de sus anuncios" ON storage.objects;

-- Políticas para el bucket `avatars`
CREATE POLICY "Los usuarios pueden subir avatares" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Cualquiera puede ver avatares" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Políticas para el bucket `ad_images`
CREATE POLICY "Los usuarios pueden gestionar las imágenes de sus anuncios" ON storage.objects
FOR ALL USING (
  bucket_id = 'ad_images' AND
  auth.uid() = (
    SELECT user_id FROM public.ads WHERE image_url LIKE '%' || name
  )
);
