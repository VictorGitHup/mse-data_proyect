
-- Plataforma de Anuncios Clasificados - Schema v1.0

-- 1. Borrar tablas existentes (si existen) para un inicio limpio.
-- Esto es útil para desarrollo, pero debe usarse con precaución en producción.
DROP TABLE IF EXISTS public.boost_transactions CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.ad_media CASCADE;
DROP TABLE IF EXISTS public.ads CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Definir los tipos ENUM para roles y estados.
-- Esto asegura la consistencia de los datos en toda la aplicación.

CREATE TYPE public.user_role AS ENUM (
  'USER',       -- Usuario estándar que puede navegar, calificar y comentar.
  'ADVERTISER'  -- Usuario que puede crear y gestionar anuncios.
);

CREATE TYPE public.ad_status AS ENUM (
  'active',     -- El anuncio es visible públicamente.
  'inactive',   -- El anuncio está pausado por el anunciante y no es visible.
  'draft',      -- El anuncio está en borrador y solo es visible para el anunciante.
  'expired'     -- El anuncio ha expirado y no es visible.
);

CREATE TYPE public.ad_media_type AS ENUM (
  'image',
  'video'
);

CREATE TYPE public.comment_status AS ENUM (
  'pending',    -- El comentario está esperando aprobación del anunciante.
  'approved',   -- El comentario es visible públicamente.
  'rejected'    -- El comentario ha sido rechazado y no es visible.
);


-- 3. Tabla de Perfiles de Usuario (public.profiles)
-- Almacena datos públicos del usuario, extendiendo la tabla auth.users.

CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  role user_role NOT NULL,
  updated_at timestamptz,
  -- Campos de contacto específicos para anunciantes
  contact_email text,
  contact_whatsapp text,
  contact_telegram text,
  contact_social_url text
);

COMMENT ON TABLE public.profiles IS 'Almacena datos públicos del perfil de usuario.';


-- 4. Tabla de Categorías (public.categories)
-- Almacena las categorías de los anuncios (Ej: Scorts, Chicas Trans).

CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name text NOT NULL UNIQUE
);

COMMENT ON TABLE public.categories IS 'Almacena las categorías para los anuncios.';

-- Insertar categorías iniciales
INSERT INTO public.categories (name) VALUES
('Scorts'),
('Chicas Trans'),
('Scorts Gay'),
('Servicios Virtuales');


-- 5. Tabla de Ubicaciones (public.locations)
-- Estructura jerárquica para países, regiones y subregiones.

CREATE TABLE public.locations (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL, -- 'country', 'region', 'subregion'
  parent_id INTEGER REFERENCES public.locations(id),
  code text -- Código opcional (DANE, ISO, etc.)
);

COMMENT ON TABLE public.locations IS 'Almacena ubicaciones jerárquicas (países, regiones, ciudades).';


-- 6. Tabla de Anuncios (public.ads)

CREATE TABLE public.ads (
  id BIGSERIAL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category_id INTEGER NOT NULL REFERENCES public.categories(id),
  country_id INTEGER REFERENCES public.locations(id),
  region_id INTEGER REFERENCES public.locations(id),
  subregion_id INTEGER REFERENCES public.locations(id),
  status ad_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  boosted_until timestamptz, -- Fecha hasta la que el anuncio está potenciado
  slug text NOT NULL UNIQUE
);

COMMENT ON TABLE public.ads IS 'Almacena los anuncios clasificados.';


-- 7. Tabla de Multimedia de Anuncios (public.ad_media)
-- Almacena hasta 5 imágenes o videos por anuncio.

CREATE TABLE public.ad_media (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  type ad_media_type NOT NULL,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ad_media IS 'Almacena imágenes y videos asociados a un anuncio.';


-- 8. Tabla de Calificaciones (public.ratings)

CREATE TABLE public.ratings (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ad_id, user_id) -- Un usuario solo puede calificar un anuncio una vez.
);

COMMENT ON TABLE public.ratings IS 'Almacena las calificaciones de los anuncios.';


-- 9. Tabla de Comentarios (public.comments)

CREATE TABLE public.comments (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  status comment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comments IS 'Almacena los comentarios de los usuarios en los anuncios.';


-- 10. Tabla de Transacciones de Potenciación (public.boost_transactions)

CREATE TABLE public.boost_transactions (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_days INTEGER NOT NULL,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  payment_id text -- ID de la transacción del proveedor de pago (Ej: Stripe)
);

COMMENT ON TABLE public.boost_transactions IS 'Registra las transacciones de potenciación de anuncios.';


-- 11. Trigger para Creación de Perfiles
-- Esta función se ejecuta automáticamente cuando un nuevo usuario se registra.

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

-- Crear el trigger que llama a la función
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 12. Configuración de Almacenamiento (Storage)

-- Crear bucket para avatares
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Crear bucket para multimedia de anuncios
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad_media', 'ad_media', true)
ON CONFLICT (id) DO NOTHING;


-- 13. Políticas de Seguridad a Nivel de Fila (RLS)

-- RLS para perfiles (profiles)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los perfiles son públicos"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- RLS para anuncios (ads)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los anuncios activos son públicos"
ON public.ads FOR SELECT USING (status = 'active');

CREATE POLICY "Los anunciantes pueden ver sus propios anuncios inactivos/borrador"
ON public.ads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Los anunciantes pueden crear anuncios"
ON public.ads FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER'
);

CREATE POLICY "Los anunciantes pueden actualizar sus propios anuncios"
ON public.ads FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los anunciantes pueden eliminar sus propios anuncios"
ON public.ads FOR DELETE
USING (auth.uid() = user_id);


-- RLS para multimedia de anuncios (ad_media)
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver la multimedia de anuncios activos"
ON public.ad_media FOR SELECT USING (
  ad_id IN (SELECT id FROM public.ads WHERE status = 'active')
);

CREATE POLICY "Los anunciantes pueden ver la multimedia de sus propios anuncios"
ON public.ad_media FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Los anunciantes pueden insertar multimedia en sus anuncios"
ON public.ad_media FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los anunciantes pueden actualizar la multimedia de sus anuncios"
ON public.ad_media FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los anunciantes pueden eliminar la multimedia de sus anuncios"
ON public.ad_media FOR DELETE USING (auth.uid() = user_id);


-- RLS para calificaciones (ratings)
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Las calificaciones son públicas"
ON public.ratings FOR SELECT USING (true);

CREATE POLICY "Los usuarios autenticados pueden calificar"
ON public.ratings FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  -- Un anunciante no puede calificar su propio anuncio
  user_id <> (SELECT user_id FROM public.ads WHERE id = ad_id)
);

CREATE POLICY "Los usuarios pueden actualizar su propia calificación"
ON public.ratings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- RLS para comentarios (comments)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los comentarios aprobados son públicos"
ON public.comments FOR SELECT USING (status = 'approved');

CREATE POLICY "Los usuarios pueden ver sus propios comentarios pendientes"
ON public.comments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "El anunciante puede ver todos los comentarios en sus anuncios"
ON public.comments FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM public.ads WHERE id = ad_id)
);

CREATE POLICY "Los usuarios autenticados pueden comentar"
ON public.comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  -- Un anunciante no puede comentar su propio anuncio
  user_id <> (SELECT user_id FROM public.ads WHERE id = ad_id)
);

CREATE POLICY "El anunciante puede moderar los comentarios en sus anuncios"
ON public.comments FOR UPDATE
USING (auth.uid() = (SELECT user_id FROM public.ads WHERE id = ad_id))
WITH CHECK (auth.uid() = (SELECT user_id FROM public.ads WHERE id = ad_id));

CREATE POLICY "Los usuarios pueden eliminar sus propios comentarios"
ON public.comments FOR DELETE USING (auth.uid() = user_id);


-- RLS para transacciones de potenciación (boost_transactions)
ALTER TABLE public.boost_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios solo pueden ver sus propias transacciones"
ON public.boost_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Los anunciantes pueden crear transacciones para sus anuncios"
ON public.boost_transactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  user_id = (SELECT user_id FROM public.ads WHERE id = ad_id)
);


-- RLS para almacenamiento (Storage)

-- Políticas para avatares
CREATE POLICY "Los avatares son públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Los usuarios pueden subir/actualizar su propio avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Los usuarios pueden actualizar su propio avatar (update)"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid)
WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid);


-- Políticas para multimedia de anuncios
CREATE POLICY "La multimedia de anuncios es pública"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_media');

CREATE POLICY "Los anunciantes pueden subir multimedia a sus anuncios"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad_media' AND auth.uid() = (storage.foldername(name))[1::uuid]);

CREATE POLICY "Los anunciantes pueden actualizar su multimedia"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ad_media' AND auth.uid() = (storage.foldername(name))[1::uuid])
WITH CHECK (bucket_id = 'ad_media' AND auth.uid() = (storage.foldername(name))[1::uuid]);

CREATE POLICY "Los anunciantes pueden eliminar su multimedia"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad_media' AND auth.uid() = (storage.foldername(name))[1::uuid]);
