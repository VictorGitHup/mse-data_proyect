-- ### TIPOS ###
DROP TYPE IF EXISTS public.user_role;
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');

DROP TYPE IF EXISTS public.ad_status;
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');

-- ### TABLAS ###

-- Tabla de Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
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
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user.';

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name text NOT NULL UNIQUE
);
COMMENT ON TABLE public.categories IS 'Stores ad categories.';

-- Tabla de Ubicaciones
CREATE TABLE IF NOT EXISTS public.locations (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL, -- 'country', 'region', 'subregion'
    parent_id INTEGER REFERENCES public.locations(id),
    code VARCHAR(10),
    phone_code VARCHAR(10)
);
COMMENT ON TABLE public.locations IS 'Stores hierarchical location data.';

-- Tabla de Anuncios
CREATE TABLE IF NOT EXISTS public.ads (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text NOT NULL,
  category_id INT NOT NULL REFERENCES public.categories(id),
  country_id INT REFERENCES public.locations(id),
  region_id INT REFERENCES public.locations(id),
  subregion_id INT REFERENCES public.locations(id),
  status ad_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  boosted_until timestamptz,
  slug text NOT NULL UNIQUE
);
COMMENT ON TABLE public.ads IS 'Stores classified ads.';

-- Tabla de Multimedia de Anuncios
CREATE TABLE IF NOT EXISTS public.ad_media (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  url text NOT NULL,
  type TEXT NOT NULL, -- 'image' or 'video'
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ad_media IS 'Stores media files (images/videos) for ads.';

-- ### FUNCIONES Y TRIGGERS ###

-- Función para manejar la creación de un nuevo usuario
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
    (new.raw_user_meta_data->>'role')::user_role
  );
  RETURN new;
END;
$$;

-- Trigger que se dispara después de que un usuario se registra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ### ALMACENAMIENTO (STORAGE) ###

-- Bucket para avatares de perfil
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para imágenes y videos de anuncios
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad_media', 'ad_media', true)
ON CONFLICT (id) DO NOTHING;


-- ### POLÍTICAS DE SEGURIDAD (RLS) ###

-- Activar RLS para las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- --- Políticas para `profiles` ---
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK ((auth.uid() = id));

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING ((auth.uid() = id));

-- --- Políticas para `ads` ---
DROP POLICY IF EXISTS "Ads are viewable by everyone." ON public.ads;
CREATE POLICY "Ads are viewable by everyone." ON public.ads
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Advertisers can create ads." ON public.ads
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'));

DROP POLICY IF EXISTS "Advertisers can update their own ads." ON public.ads
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Advertisers can delete their own ads." ON public.ads
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));
  
-- --- Políticas para `ad_media` ---
DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
CREATE POLICY "Ad media is viewable by everyone." ON public.ad_media
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Advertisers can upload media for their ads." ON public.ad_media
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'));
  
DROP POLICY IF EXISTS "Advertisers can delete their own media." ON public.ad_media
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));

-- --- Políticas para `categories` y `locations` (Tablas públicas) ---
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone." ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Locations are viewable by everyone." ON public.locations;
CREATE POLICY "Locations are viewable by everyone." ON public.locations
  FOR SELECT USING (true);


-- --- Políticas para `storage.objects` (Almacenamiento) ---
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar." ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Ad media files are publicly accessible." ON storage.objects;
CREATE POLICY "Ad media files are publicly accessible." ON storage.objects
  FOR SELECT USING (bucket_id = 'ad_media');

DROP POLICY IF EXISTS "Advertisers can upload media." ON storage.objects;
CREATE POLICY "Advertisers can upload media." ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad_media' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER');

DROP POLICY IF EXISTS "Advertisers can delete their own media." ON storage.objects;
CREATE POLICY "Advertisers can delete their own media." ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ad_media' AND owner = auth.uid());


-- ### DATOS INICIALES ###

-- Insertar categorías si no existen
INSERT INTO public.categories (name) VALUES
  ('Scorts'),
  ('Chicas Trans'),
  ('Scorts Gay'),
  ('Servicios Virtuales')
ON CONFLICT (name) DO NOTHING;


-- Insertar ubicaciones de ejemplo si no existen
-- Es importante que el `id` no se especifique para que sea autoincremental
-- PAÍSES
INSERT INTO public.locations (name, type, code, phone_code) VALUES
  ('Colombia', 'country', 'CO', '57'),
  ('España', 'country', 'ES', '34')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    colombia_id INT;
    espana_id INT;
    antioquia_id INT;
    madrid_region_id INT;
BEGIN
    -- Obtener IDs de los países
    SELECT id INTO colombia_id FROM public.locations WHERE name = 'Colombia' AND type = 'country';
    SELECT id INTO espana_id FROM public.locations WHERE name = 'España' AND type = 'country';

    -- REGIONES (dependen de los países)
    IF colombia_id IS NOT NULL THEN
        INSERT INTO public.locations (name, type, parent_id) VALUES
            ('Antioquia', 'region', colombia_id)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    IF espana_id IS NOT NULL THEN
        INSERT INTO public.locations (name, type, parent_id) VALUES
            ('Comunidad de Madrid', 'region', espana_id)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- Obtener IDs de las regiones
    SELECT id INTO antioquia_id FROM public.locations WHERE name = 'Antioquia' AND parent_id = colombia_id;
    SELECT id INTO madrid_region_id FROM public.locations WHERE name = 'Comunidad de Madrid' AND parent_id = espana_id;

    -- SUBREGIONES/CIUDADES (dependen de las regiones)
    IF antioquia_id IS NOT NULL THEN
        INSERT INTO public.locations (name, type, parent_id) VALUES
            ('Medellín', 'subregion', antioquia_id)
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    IF madrid_region_id IS NOT NULL THEN
        INSERT INTO public.locations (name, type, parent_id) VALUES
            ('Madrid', 'subregion', madrid_region_id)
        ON CONFLICT (id) DO NOTHING;
    END IF;

END $$;
