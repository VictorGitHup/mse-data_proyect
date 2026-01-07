
-- =================================================================
-- 1. TIPOS DE DATOS PERSONALIZADOS (ENUMS)
-- Define tipos reutilizables para garantizar la consistencia de los datos.
-- =================================================================

-- Define los roles de usuario en el sistema.
create type public.user_role as enum ('USER', 'ADVERTISER');

-- Define los posibles estados de un anuncio.
create type public.ad_status as enum ('active', 'inactive', 'draft', 'expired');

-- Define los tipos de medios que se pueden asociar a un anuncio.
create type public.ad_media_type as enum ('image', 'video');

-- Define los estados de los comentarios para moderación.
create type public.comment_status as enum ('pending', 'approved', 'rejected');

-- Define los tipos de ubicaciones geográficas.
create type public.location_type as enum ('country', 'region', 'subregion');


-- =================================================================
-- 2. TABLAS
-- Definición de las tablas principales de la base de datos.
-- =================================================================

-- Tabla para almacenar perfiles de usuario públicos.
-- Se vincula con la tabla `auth.users` de Supabase.
create table public.profiles (
  id uuid not null primary key references auth.users on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'USER',
  updated_at timestamptz,
  -- Campos de contacto para anunciantes
  contact_email text,
  contact_whatsapp text,
  contact_telegram text,
  contact_social_url text,

  constraint username_length check (char_length(username) >= 3)
);
comment on table public.profiles is 'Datos públicos del perfil para cada usuario.';
comment on column public.profiles.id is 'Referencia al usuario en auth.users.';


-- Tabla para categorías de anuncios.
create table public.categories (
  id serial primary key,
  name text not null unique
);
comment on table public.categories is 'Categorías para clasificar los anuncios.';


-- Tabla para ubicaciones geográficas (países, regiones, subregiones).
create table public.locations (
    id serial primary key,
    name text not null,
    type public.location_type not null,
    parent_id integer references public.locations(id) on delete cascade,
    code text -- Opcional, para códigos estandarizados (ej. DANE, ISO).
);
create index idx_locations_parent_id on public.locations(parent_id);
comment on table public.locations is 'Almacena la estructura jerárquica de ubicaciones.';


-- Tabla principal de anuncios.
create table public.ads (
  id bigserial primary key,
  user_id uuid not null references public.profiles on delete cascade,
  title text not null,
  description text not null,
  slug text not null unique,
  category_id integer not null references public.categories on delete set null,
  country_id integer references public.locations(id) on delete set null,
  region_id integer references public.locations(id) on delete set null,
  subregion_id integer references public.locations(id) on delete set null,
  status public.ad_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  boosted_until timestamptz
);
create index idx_ads_user_id on public.ads(user_id);
create index idx_ads_status on public.ads(status);
create index idx_ads_slug on public.ads(slug);
comment on table public.ads is 'Almacena todos los anuncios clasificados creados por los usuarios.';


-- Tabla para almacenar imágenes y videos de los anuncios.
create table public.ad_media (
    id bigserial primary key,
    ad_id bigint not null references public.ads on delete cascade,
    user_id uuid not null references public.profiles on delete cascade,
    url text not null,
    type public.ad_media_type not null default 'image',
    is_cover boolean not null default false,
    created_at timestamptz not null default now()
);
create index idx_ad_media_ad_id on public.ad_media(ad_id);
comment on table public.ad_media is 'Medios (imágenes/videos) asociados a cada anuncio.';


-- Tabla para calificaciones de anuncios.
create table public.ratings (
    id bigserial primary key,
    ad_id bigint not null references public.ads on delete cascade,
    user_id uuid not null references public.profiles on delete cascade,
    rating smallint not null check (rating >= 1 and rating <= 5),
    created_at timestamptz not null default now(),
    -- Un usuario solo puede calificar un anuncio una vez.
    unique (ad_id, user_id)
);
comment on table public.ratings is 'Calificaciones (1-5 estrellas) de los usuarios para los anuncios.';


-- Tabla para comentarios en los anuncios.
create table public.comments (
    id bigserial primary key,
    ad_id bigint not null references public.ads on delete cascade,
    user_id uuid not null references public.profiles on delete cascade,
    content text not null,
    status public.comment_status not null default 'pending',
    created_at timestamptz not null default now()
);
comment on table public.comments is 'Comentarios de los usuarios en los anuncios, con moderación.';


-- Tabla para transacciones de anuncios potenciados.
create table public.boost_transactions (
    id bigserial primary key,
    ad_id bigint not null references public.ads on delete cascade,
    user_id uuid not null references public.profiles on delete cascade,
    boost_duration_days integer not null,
    payment_id text, -- ID de la transacción del proveedor de pagos (ej. Stripe)
    created_at timestamptz not null default now()
);
comment on table public.boost_transactions is 'Registro de pagos para potenciar anuncios.';


-- =================================================================
-- 3. FUNCIÓN Y TRIGGER PARA CREACIÓN DE PERFILES
-- Automatiza la creación de un perfil cuando un usuario se registra.
-- =================================================================

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
    (new.raw_user_meta_data->>'role')::public.user_role
  );
  return new;
end;
$$;

-- Disparador que ejecuta la función después de que se crea un usuario en `auth.users`.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =================================================================
-- 4. CONFIGURACIÓN DEL ALMACENAMIENTO (STORAGE)
-- Creación de buckets para almacenar archivos.
-- =================================================================

-- Bucket para los avatares de los usuarios.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, '{"image/jpeg","image/png","image/webp"}')
on conflict (id) do nothing;

-- Bucket para imágenes y videos de los anuncios.
insert into storage.buckets (id, name, public, file_size_limit)
values ('ad_media', 'ad_media', true, 52428800) -- 50MB
on conflict (id) do nothing;


-- =================================================================
-- 5. POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (RLS)
-- Asegura que los usuarios solo puedan acceder a los datos que les corresponden.
-- =================================================================

-- --- Policies para la tabla `profiles` ---
alter table public.profiles enable row level security;

-- Los usuarios pueden ver todos los perfiles.
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

-- Los usuarios solo pueden insertar o actualizar su propio perfil.
create policy "Users can insert or update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );


-- --- Policies para la tabla `ads` ---
alter table public.ads enable row level security;

-- Todos pueden ver los anuncios activos.
create policy "Active ads are viewable by everyone."
  on public.ads for select
  using ( status = 'active' );

-- Los anunciantes pueden ver sus propios anuncios, sin importar el estado.
create policy "Advertisers can view their own ads."
  on public.ads for select
  using ( auth.uid() = user_id );

-- Los anunciantes pueden crear anuncios.
create policy "Advertisers can create ads."
  on public.ads for insert
  with check ( auth.uid() = user_id and (select role from public.profiles where id = auth.uid()) = 'ADVERTISER' );

-- Los anunciantes solo pueden actualizar sus propios anuncios.
create policy "Advertisers can update their own ads."
  on public.ads for update
  using ( auth.uid() = user_id );

-- Los anunciantes solo pueden eliminar sus propios anuncios.
create policy "Advertisers can delete their own ads."
  on public.ads for delete
  using ( auth.uid() = user_id );


-- --- Policies para la tabla `ad_media` ---
alter table public.ad_media enable row level security;

-- Todos pueden ver los medios de los anuncios.
create policy "Ad media is viewable by everyone."
  on public.ad_media for select
  using ( true );

-- Los anunciantes pueden subir medios para sus propios anuncios.
create policy "Advertisers can insert media for their own ads."
  on public.ad_media for insert
  with check ( auth.uid() = user_id );

-- Los anunciantes solo pueden eliminar medios de sus propios anuncios.
create policy "Advertisers can delete their own media."
  on public.ad_media for delete
  using ( auth.uid() = user_id );


-- --- Policies para la tabla `ratings` ---
alter table public.ratings enable row level security;

-- Todos pueden ver las calificaciones.
create policy "Ratings are viewable by everyone."
  on public.ratings for select
  using ( true );

-- Los usuarios autenticados pueden crear calificaciones.
create policy "Authenticated users can create ratings."
  on public.ratings for insert
  with check ( auth.uid() = user_id );

-- Los usuarios solo pueden actualizar su propia calificación.
create policy "Users can update their own rating."
  on public.ratings for update
  using ( auth.uid() = user_id );


-- --- Policies para la tabla `comments` ---
alter table public.comments enable row level security;

-- Todos pueden ver los comentarios aprobados.
create policy "Everyone can view approved comments."
  on public.comments for select
  using ( status = 'approved' );

-- Los anunciantes pueden ver todos los comentarios de sus propios anuncios.
create policy "Advertisers can view all comments on their ads."
  on public.comments for select
  using ( auth.uid() = (select user_id from ads where id = comments.ad_id) );

-- Los usuarios autenticados pueden crear comentarios.
create policy "Authenticated users can insert comments."
  on public.comments for insert
  with check ( auth.uid() = user_id );

-- Los anunciantes pueden moderar (actualizar el estado) de los comentarios en sus anuncios.
create policy "Advertisers can moderate comments on their ads."
  on public.comments for update
  using ( auth.uid() = (select user_id from ads where id = comments.ad_id) );

-- Los usuarios pueden eliminar sus propios comentarios.
create policy "Users can delete their own comments."
  on public.comments for delete
  using ( auth.uid() = user_id );


-- --- Policies para `locations` y `categories` ---
alter table public.locations enable row level security;
alter table public.categories enable row level security;

-- Todos pueden ver las ubicaciones y categorías.
create policy "Locations and categories are viewable by everyone."
  on public.locations for select using ( true );
create policy "Categories are viewable by everyone."
  on public.categories for select using ( true );


-- --- Policies para el bucket `avatars` en Storage ---
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );

create policy "Anyone can update their own avatar."
  on storage.objects for update
  using ( auth.uid() = owner )
  with check ( bucket_id = 'avatars' );


-- --- Policies para el bucket `ad_media` en Storage ---
create policy "Ad media are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'ad_media' );

create policy "Advertisers can upload ad media."
  on storage.objects for insert
  with check ( bucket_id = 'ad_media' and (select role from public.profiles where id = auth.uid()) = 'ADVERTISER' );

create policy "Advertisers can update their own ad media."
  on storage.objects for update
  using ( auth.uid() = owner )
  with check ( bucket_id = 'ad_media' );

create policy "Advertisers can delete their own ad media."
  on storage.objects for delete
  using ( auth.uid() = owner )
  with check ( bucket_id = 'ad_media' );
