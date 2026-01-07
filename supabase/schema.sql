-- 1. Tipos Personalizados (ENUMS)
DROP TYPE IF EXISTS public.user_role;
CREATE TYPE public.user_role AS ENUM ('USER', 'ADVERTISER');

DROP TYPE IF EXISTS public.ad_status;
CREATE TYPE public.ad_status AS ENUM ('active', 'inactive', 'draft', 'expired');

DROP TYPE IF EXISTS public.comment_status;
CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected');

DROP TYPE IF EXISTS public.media_type;
CREATE TYPE public.media_type AS ENUM ('image', 'video');


-- 2. Tabla de Ubicaciones
DROP TABLE IF EXISTS public.locations;
CREATE TABLE public.locations (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    type text NOT NULL,
    parent_id integer REFERENCES public.locations(id) ON DELETE CASCADE,
    code text,
    phone_code text
);


-- 3. Tabla de Categorías
DROP TABLE IF EXISTS public.categories;
CREATE TABLE public.categories (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL
);


-- 4. Tabla de Perfiles de Usuario
DROP TABLE IF EXISTS public.profiles;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz,
  username text UNIQUE NOT NULL,
  avatar_url text,
  full_name text,
  role user_role NOT NULL DEFAULT 'USER',
  country_id integer REFERENCES public.locations(id),
  contact_email text,
  contact_whatsapp text,
  contact_telegram text,
  contact_social_url text,

  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);


-- 5. Tabla de Anuncios
DROP TABLE IF EXISTS public.ads;
CREATE TABLE public.ads (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    category_id integer NOT NULL REFERENCES public.categories(id),
    country_id integer REFERENCES public.locations(id),
    region_id integer REFERENCES public.locations(id),
    subregion_id integer REFERENCES public.locations(id),
    status ad_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    boosted_until timestamptz,
    slug text UNIQUE NOT NULL,
    tags text[]
);


-- 6. Tabla de Multimedia de Anuncios
DROP TABLE IF EXISTS public.ad_media;
CREATE TABLE public.ad_media (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url text NOT NULL,
    type media_type NOT NULL,
    is_cover boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);


-- 7. Tabla de Calificaciones de Anuncios
DROP TABLE IF EXISTS public.ad_ratings;
CREATE TABLE public.ad_ratings (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (ad_id, user_id)
);


-- 8. Tabla de Comentarios de Anuncios
DROP TABLE IF EXISTS public.ad_comments;
CREATE TABLE public.ad_comments (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ad_id bigint NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment text NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);


-- Función y Trigger para crear perfil de usuario automáticamente
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
    (new.raw_user_meta_data->>'role')::user_role
  );
  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Activación de RLS
alter table public.profiles enable row level security;
alter table public.ads enable row level security;
alter table public.ad_media enable row level security;
alter table public.ad_ratings enable row level security;
alter table public.ad_comments enable row level security;
alter table public.categories enable row level security;
alter table public.locations enable row level security;


-- Políticas de Seguridad para `profiles`
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


-- Políticas de Seguridad para `ads`
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
USING ((auth.uid() = user_id))
WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Advertisers can delete their own ads." ON public.ads;
CREATE POLICY "Advertisers can delete their own ads."
ON public.ads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- Políticas de Seguridad para `ad_media`
DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
CREATE POLICY "Ad media is viewable by everyone."
ON public.ad_media FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Advertisers can add media to their own ads." ON public.ad_gmedia;
CREATE POLICY "Advertisers can add media to their own ads."
ON public.ad_media FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can delete media from their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can delete media from their own ads."
ON public.ad_media FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- Políticas de Seguridad para `ad_ratings`
DROP POLICY IF EXISTS "Ratings are viewable by everyone." ON public.ad_ratings;
CREATE POLICY "Ratings are viewable by everyone."
ON public.ad_ratings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can rate an ad, but not their own." ON public.ad_ratings;
CREATE POLICY "Users can rate an ad, but not their own."
ON public.ad_ratings FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  NOT EXISTS (
    SELECT 1 FROM public.ads WHERE ads.id = ad_ratings.ad_id AND ads.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own rating." ON public.ad_ratings;
CREATE POLICY "Users can update their own rating."
ON public.ad_ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);


-- Políticas de Seguridad para `ad_comments`
DROP POLICY IF EXISTS "Approved comments are viewable by everyone." ON public.ad_comments;
CREATE POLICY "Approved comments are viewable by everyone."
ON public.ad_comments FOR SELECT
USING (status = 'approved');

DROP POLICY IF EXISTS "Users can view their own pending/rejected comments." ON public.ad_comments;
CREATE POLICY "Users can view their own pending/rejected comments."
ON public.ad_comments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can see all comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can see all comments on their ads."
ON public.ad_comments FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ads WHERE ads.id = ad_comments.ad_id AND ads.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can comment on any ad, but not their own." ON public.ad_comments;
CREATE POLICY "Users can comment on any ad, but not their own."
ON public.ad_comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  NOT EXISTS (
    SELECT 1 FROM public.ads WHERE ads.id = ad_comments.ad_id AND ads.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Advertisers can moderate comments on their ads." ON public.ad_comments;
CREATE POLICY "Advertisers can moderate comments on their ads."
ON public.ad_comments FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ads WHERE ads.id = ad_comments.ad_id AND ads.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ads WHERE ads.id = ad_comments.ad_id AND ads.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete their own comments." ON public.ad_comments;
CREATE POLICY "Users can delete their own comments."
ON public.ad_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- Políticas para `categories` y `locations`
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone."
ON public.categories FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Locations are viewable by everyone." ON public.locations;
CREATE POLICY "Locations are viewable by everyone."
ON public.locations FOR SELECT
USING (true);


-- Configuración de Almacenamiento (Storage)
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar."
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

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
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Advertisers can delete their own media." ON storage.objects;
CREATE POLICY "Advertisers can delete their own media."
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ad_media' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
