-- 1. TIPOS DE DATOS PERSONALIZADOS
-- Define un tipo para los roles de usuario para asegurar consistencia.
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');

-- Define un tipo para los estados de los anuncios.
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');


-- 2. TABLAS DE LA BASE DE DATOS

-- Tabla de perfiles de usuario, se extiende de auth.users
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL CHECK (char_length(username) >= 3),
    full_name text,
    avatar_url text,
    role user_role NOT NULL DEFAULT 'USER',
    updated_at timestamptz
);
COMMENT ON TABLE public.profiles IS 'Almacena los datos públicos del perfil de cada usuario.';

-- Tabla para categorías de anuncios
CREATE TABLE public.categories (
    id smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text UNIQUE NOT NULL
);
COMMENT ON TABLE public.categories IS 'Almacena las categorías de los anuncios.';

-- Tabla para ubicaciones (países, regiones, ciudades)
CREATE TABLE public.locations (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('country', 'region', 'subregion')),
    parent_id integer REFERENCES public.locations(id),
    code text -- Para códigos de país/región (ej. MX, JAL)
);
COMMENT ON TABLE public.locations IS 'Almacena la información jerárquica de ubicaciones.';

-- Tabla principal de anuncios
CREATE TABLE public.ads (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    image_url text,
    category_id smallint NOT NULL REFERENCES public.categories(id),
    country_id integer REFERENCES public.locations(id),
    region_id integer REFERENCES public.locations(id),
    subregion_id integer REFERENCES public.locations(id),
    status ad_status NOT NULL DEFAULT 'draft',
    slug text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);
COMMENT ON TABLE public.ads IS 'Almacena todos los anuncios clasificados de la plataforma.';
CREATE INDEX ON public.ads (user_id);
CREATE INDEX ON public.ads (category_id);
CREATE INDEX ON public.ads (status);
CREATE INDEX ON public.ads (country_id, region_id, subregion_id);


-- 3. AUTOMATIZACIÓN DE PERFILES
-- Función que se ejecuta al crear un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'role'
  );
  return new;
end;
$$;

-- Trigger que llama a la función handle_new_user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 4. ALMACENAMIENTO (STORAGE)
-- Crea los buckets para imágenes
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('ad_images', 'ad_images', true)
ON CONFLICT (id) DO NOTHING;


-- 5. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)

-- Activar RLS para todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla 'profiles'
CREATE POLICY "Los perfiles públicos son visibles para todos." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Los usuarios pueden insertar su propio perfil." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Los usuarios pueden actualizar su propio perfil." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para la tabla 'categories' y 'locations' (datos maestros)
CREATE POLICY "Las categorías son visibles para todos." ON public.categories FOR SELECT USING (true);
CREATE POLICY "Las ubicaciones son visibles para todos." ON public.locations FOR SELECT USING (true);

-- Políticas para la tabla 'ads'
CREATE POLICY "Los anuncios activos son visibles para todos." ON public.ads FOR SELECT USING (status = 'active');
CREATE POLICY "Los usuarios pueden ver sus propios anuncios inactivos." ON public.ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios anunciantes pueden crear anuncios." ON public.ads FOR INSERT WITH CHECK (auth.uid() = user_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER');
CREATE POLICY "Los usuarios pueden actualizar sus propios anuncios." ON public.ads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden eliminar sus propios anuncios." ON public.ads FOR DELETE USING (auth.uid() = user_id);

-- Políticas de seguridad para el Almacenamiento (Storage)
CREATE POLICY "Cualquiera puede ver los avatares públicos." ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
CREATE POLICY "Los usuarios pueden subir un avatar a su propia carpeta." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner AND (storage.foldername(name))[1] = auth.uid()::text );
CREATE POLICY "Los usuarios pueden actualizar su propio avatar." ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner AND (storage.foldername(name))[1] = auth.uid()::text );

CREATE POLICY "Cualquiera puede ver las imágenes públicas de los anuncios." ON storage.objects FOR SELECT USING ( bucket_id = 'ad_images' );
CREATE POLICY "Los usuarios autenticados pueden subir imágenes de anuncios." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'ad_images' AND auth.uid() = owner );
CREATE POLICY "Los usuarios pueden actualizar sus propias imágenes de anuncios." ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'ad_images' AND auth.uid() = owner );
CREATE POLICY "Los usuarios pueden eliminar sus propias imágenes de anuncios." ON storage.objects FOR DELETE USING ( bucket_id = 'ad_images' AND auth.uid() = owner );
