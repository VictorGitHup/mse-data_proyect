-- -------------------------------------------------------------------------------------
-- 1. TIPOS PERSONALIZADOS
-- Se definen los ENUM para roles y estados, asegurando consistencia en los datos.
-- -------------------------------------------------------------------------------------
-- Eliminar tipos existentes si es necesario para evitar errores en re-ejecución
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.ad_status;
DROP TYPE IF EXISTS public.comment_status;

-- Define los roles de usuario en el sistema
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');
-- Define los posibles estados de un anuncio
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');
-- Define los posibles estados de un comentario
CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected');


-- -------------------------------------------------------------------------------------
-- 2. TABLAS
-- Se crean las tablas principales de la aplicación.
-- -------------------------------------------------------------------------------------

-- Almacena el perfil público de los usuarios, extendiendo la tabla auth.users.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'USER',
  updated_at timestamptz,
  -- Campos de contacto para anunciantes
  contact_email text,
  contact_whatsapp text,
  contact_telegram text,
  contact_social_url text,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);
COMMENT ON TABLE public.profiles IS 'Almacena datos públicos del perfil de los usuarios.';

-- Tabla para categorías de anuncios.
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  name text UNIQUE NOT NULL
);
COMMENT ON TABLE public.categories IS 'Almacena las categorías para los anuncios.';

-- Tabla para localizaciones (países, regiones, subregiones).
CREATE TABLE IF NOT EXISTS public.locations (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL, -- 'country', 'region', 'subregion'
  parent_id INTEGER REFERENCES public.locations(id),
  code text -- Código opcional (ej: MX para México)
);
COMMENT ON TABLE public.locations IS 'Almacena datos geográficos jerárquicos.';

-- Tabla principal de anuncios.
CREATE TABLE IF NOT EXISTS public.ads (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category_id INTEGER NOT NULL REFERENCES public.categories(id),
  country_id INTEGER NOT NULL REFERENCES public.locations(id),
  region_id INTEGER NOT NULL REFERENCES public.locations(id),
  subregion_id INTEGER REFERENCES public.locations(id),
  slug text UNIQUE NOT NULL,
  status ad_status NOT NULL DEFAULT 'draft',
  image_url text,
  video_url text,
  boosted_until timestamptz, -- Fecha hasta la que el anuncio está potenciado
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);
COMMENT ON TABLE public.ads IS 'Almacena todos los anuncios clasificados.';

-- Tabla para calificaciones de anuncios.
CREATE TABLE IF NOT EXISTS public.ratings (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ad_id, user_id) -- Un usuario solo puede calificar un anuncio una vez
);
COMMENT ON TABLE public.ratings IS 'Almacena las calificaciones (1-5 estrellas) de los usuarios en los anuncios.';

-- Tabla para comentarios en los anuncios.
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  status comment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.comments IS 'Almacena los comentarios de los usuarios en los anuncios, con estado de moderación.';

-- Tabla para transacciones de potenciación de anuncios.
CREATE TABLE IF NOT EXISTS public.boost_transactions (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boost_days INTEGER NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  amount NUMERIC(10, 2), -- Opcional, para registrar el costo
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.boost_transactions IS 'Registra las transacciones para potenciar anuncios.';

-- -------------------------------------------------------------------------------------
-- 3. INSERCIONES INICIALES (Seed Data)
-- Datos iniciales para que la aplicación sea funcional desde el principio.
-- -------------------------------------------------------------------------------------
INSERT INTO public.categories (name) VALUES
('Alojamiento'),
('Transporte'),
('Tours y Actividades'),
('Comida y Bebida'),
('Eventos')
ON CONFLICT (name) DO NOTHING;

-- -------------------------------------------------------------------------------------
-- 4. TRIGGERS Y FUNCIONES
-- Lógica automatizada en la base de datos.
-- -------------------------------------------------------------------------------------

-- Función para crear un perfil de usuario automáticamente al registrarse.
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

-- Trigger que ejecuta la función después de que un nuevo usuario se inserte en auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- -------------------------------------------------------------------------------------
-- 5. ALMACENAMIENTO (Supabase Storage)
-- Configuración de los buckets para almacenar archivos.
-- -------------------------------------------------------------------------------------

-- Insertar buckets si no existen
INSERT INTO storage.buckets (id, name, public) VALUES
('avatars', 'avatars', true),
('ad_images', 'ad_images', true),
('ad_videos', 'ad_videos', true)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------------------------------
-- 6. POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (RLS)
-- Define quién puede acceder o modificar los datos. Es la capa de seguridad principal.
-- -------------------------------------------------------------------------------------

-- --- Policies for `profiles` table ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- --- Policies for `ads` table ---
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active ads are viewable by everyone." ON public.ads;
DROP POLICY IF EXISTS "Users can view their own ads." ON public.ads;
DROP POLICY IF EXISTS "Advertisers can insert their own ads." ON public.ads;
DROP POLICY IF EXISTS "Advertisers can update their own ads." ON public.ads;
DROP POLICY IF EXISTS "Advertisers can delete their own ads." ON public.ads;

CREATE POLICY "Active ads are viewable by everyone." ON public.ads FOR SELECT USING (status = 'active');
CREATE POLICY "Users can view their own ads." ON public.ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Advertisers can insert their own ads." ON public.ads FOR INSERT WITH CHECK (auth.uid() = user_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER');
CREATE POLICY "Advertisers can update their own ads." ON public.ads FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Advertisers can delete their own ads." ON public.ads FOR DELETE USING (auth.uid() = user_id);

-- --- Policies for `ratings` table ---
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ratings are public." ON public.ratings;
DROP POLICY IF EXISTS "Authenticated users can create ratings." ON public.ratings;
DROP POLICY IF EXISTS "Users can update their own rating." ON public.ratings;
DROP POLICY IF EXISTS "Users cannot rate their own ads." ON public.ratings;

CREATE POLICY "Ratings are public." ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create ratings." ON public.ratings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own rating." ON public.ratings FOR UPDATE USING (auth.uid() = user_id);
-- Política para evitar que un usuario califique su propio anuncio
CREATE POLICY "Users cannot rate their own ads." ON public.ratings FOR INSERT WITH CHECK (user_id <> (SELECT user_id FROM ads WHERE id = ad_id));

-- --- Policies for `comments` table ---
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Approved comments are public." ON public.comments;
DROP POLICY IF EXISTS "Users can see their own comments." ON public.comments;
DROP POLICY IF EXISTS "Ad owner can see all comments on their ads." ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can post comments." ON public.comments;
DROP POLICY IF EXISTS "Ad owner can moderate comments on their ads." ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments." ON public.comments;

CREATE POLICY "Approved comments are public." ON public.comments FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can see their own comments." ON public.comments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Ad owner can see all comments on their ads." ON public.comments FOR SELECT USING ((SELECT user_id FROM ads WHERE id = comments.ad_id) = auth.uid());
CREATE POLICY "Authenticated users can post comments." ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Ad owner can moderate comments on their ads." ON public.comments FOR UPDATE USING ((SELECT user_id FROM ads WHERE id = comments.ad_id) = auth.uid()) WITH CHECK (status IN ('approved', 'rejected'));
CREATE POLICY "Users can delete their own comments." ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- --- Policies for `boost_transactions` table ---
ALTER TABLE public.boost_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own boost transactions." ON public.boost_transactions;
DROP POLICY IF EXISTS "Advertisers can create boost transactions for their ads." ON public.boost_transactions;

CREATE POLICY "Users can view their own boost transactions." ON public.boost_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Advertisers can create boost transactions for their ads." ON public.boost_transactions FOR INSERT WITH CHECK (auth.uid() = user_id AND (SELECT user_id FROM ads WHERE id = ad_id) = auth.uid());

-- --- Policies for Storage `avatars` ---
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can update their own avatar." ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

-- --- Policies for Storage `ad_images` ---
DROP POLICY IF EXISTS "Ad images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Advertisers can upload images to their ads." ON storage.objects;
DROP POLICY IF EXISTS "Advertisers can update images on their ads." ON storage.objects;
DROP POLICY IF EXISTS "Advertisers can delete images from their ads." ON storage.objects;

CREATE POLICY "Ad images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'ad_images');
CREATE POLICY "Advertisers can upload images to their ads." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ad_images' AND auth.uid() IN (SELECT user_id FROM public.ads));
CREATE POLICY "Advertisers can update images on their ads." ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'ad_images' AND auth.uid() = owner);
CREATE POLICY "Advertisers can delete images from their ads." ON storage.objects FOR DELETE USING (bucket_id = 'ad_images' AND auth.uid() = owner);

-- --- Policies for Storage `ad_videos` ---
DROP POLICY IF EXISTS "Ad videos are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Advertisers can upload videos to their ads." ON storage.objects;
DROP POLICY IF EXISTS "Advertisers can update videos on their ads." ON storage.objects;
DROP POLICY IF EXISTS "Advertisers can delete videos from their ads." ON storage.objects;

CREATE POLICY "Ad videos are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'ad_videos');
CREATE POLICY "Advertisers can upload videos to their ads." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ad_videos' AND auth.uid() IN (SELECT user_id FROM public.ads));
CREATE POLICY "Advertisers can update videos on their ads." ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'ad_videos' AND auth.uid() = owner);
CREATE POLICY "Advertisers can delete videos from their ads." ON storage.objects FOR DELETE USING (bucket_id = 'ad_videos' AND auth.uid() = owner);
