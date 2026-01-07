-- Crear ENUM para roles de usuario
create type public.user_role as enum ('USER', 'ADVERTISER');

-- Crear ENUM para estados de anuncios
create type public.ad_status as enum ('active', 'inactive', 'draft', 'expired');

-- Crear ENUM para estados de comentarios
create type public.comment_status as enum ('pending', 'approved', 'rejected');

-- 1. Tabla de Perfiles de Usuario
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text not null unique,
  avatar_url text,
  role user_role not null default 'USER',
  full_name text,
  country_id int,
  contact_email text,
  contact_whatsapp text,
  contact_telegram text,
  contact_social_url text,
  updated_at timestamptz,
  primary key (id),
  constraint username_length check (char_length(username) >= 3)
);
alter table public.profiles enable row level security;

-- 2. Tabla de Categorías
create table public.categories (
  id serial primary key,
  name text not null unique
);
alter table public.categories enable row level security;

-- 3. Tabla de Ubicaciones (jerárquica)
create table public.locations (
  id serial primary key,
  name text not null,
  type text not null, -- 'country', 'region', 'subregion'
  parent_id integer references public.locations(id),
  code text, -- e.g., country code 'CO', 'ES'
  phone_code text -- e.g., '57', '34'
);
create index on public.locations (parent_id);
alter table public.locations enable row level security;

-- 4. Tabla de Anuncios (Ads)
create table public.ads (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category_id int not null references public.categories(id),
  country_id int references public.locations(id),
  region_id int references public.locations(id),
  subregion_id int references public.locations(id),
  status ad_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  boosted_until timestamptz,
  slug text not null unique
);
alter table public.ads enable row level security;
create index on public.ads (user_id);
create index on public.ads (category_id);
create index on public.ads (country_id);

-- 5. Tabla de Media de Anuncios (Imágenes/Videos)
create table public.ad_media (
  id bigserial primary key,
  ad_id bigint not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  type text not null, -- 'image' or 'video'
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ad_media enable row level security;
create index on public.ad_media (ad_id);
create index on public.ad_media (user_id);

-- 6. Tabla de Calificaciones (Ratings)
create table public.ratings (
  id bigserial primary key,
  ad_id bigint not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  created_at timestamptz not null default now(),
  unique (ad_id, user_id) -- Un usuario solo puede calificar un anuncio una vez
);
alter table public.ratings enable row level security;

-- 7. Tabla de Comentarios
create table public.comments (
  id bigserial primary key,
  ad_id bigint not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment text not null,
  status comment_status not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;

-- 8. Tabla de Transacciones (para 'boosts')
create table public.boost_transactions (
  id bigserial primary key,
  ad_id bigint not null references public.ads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount decimal(10, 2) not null,
  duration_days int not null,
  payment_provider text,
  transaction_id text,
  status text, -- 'completed', 'failed'
  created_at timestamptz not null default now()
);
alter table public.boost_transactions enable row level security;


-- Función para crear un perfil cuando se registra un nuevo usuario
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

-- Trigger que ejecuta la función después de la inserción en auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Almacenamiento (Storage)
-- Bucket para avatares de usuario
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Bucket para imágenes y videos de anuncios
insert into storage.buckets (id, name, public)
values ('ad_media', 'ad_media', true);


-- Políticas de Seguridad a Nivel de Fila (RLS)

-- 1. Profiles
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);

-- 2. Categories
create policy "Categories are viewable by everyone." on public.categories for select using (true);

-- 3. Locations
create policy "Locations are viewable by everyone." on public.locations for select using (true);

-- 4. Ads
create policy "Active ads are viewable by everyone." on public.ads for select using (status = 'active');
create policy "Advertisers can view their own ads." on public.ads for select using (auth.uid() = user_id);
create policy "Advertisers can insert their own ads." on public.ads for insert with check (auth.uid() = user_id);
create policy "Advertisers can update their own ads." on public.ads for update using (auth.uid() = user_id);
create policy "Advertisers can delete their own ads." on public.ads for delete using (auth.uid() = user_id);

-- 5. Ad Media
create policy "Ad media is viewable by everyone." on public.ad_media for select using (true);
create policy "Users can insert their own ad media." on public.ad_media for insert with check (auth.uid() = user_id);
create policy "Users can delete their own ad media." on public.ad_media for delete using (auth.uid() = user_id);
create policy "Users can update their own ad media." on public.ad_media for update using (auth.uid() = user_id);


-- 6. Ratings
create policy "Ratings are viewable by everyone." on public.ratings for select using (true);
create policy "Authenticated users can insert ratings." on public.ratings for insert with check (auth.role() = 'authenticated');
create policy "Users can update their own rating." on public.ratings for update using (auth.uid() = user_id);
create policy "Users can't rate their own ads." on public.ratings for insert with check (
  auth.uid() <> (select user_id from public.ads where id = ad_id)
);


-- 7. Comments
create policy "Approved comments are viewable by everyone." on public.comments for select using (status = 'approved');
create policy "Users can view their own comments." on public.comments for select using (auth.uid() = user_id);
create policy "Ad owners can view comments on their ads." on public.comments for select using (
  auth.uid() = (select user_id from public.ads where id = ad_id)
);
create policy "Authenticated users can insert comments." on public.comments for insert with check (auth.role() = 'authenticated');
create policy "Users can delete their own comments." on public.comments for delete using (user_id = auth.uid());
create policy "Ad owners can update comment status on their ads." on public.comments for update using (
  auth.uid() = (select user_id from public.ads where id = ad_id)
) with check (
  auth.uid() = (select user_id from public.ads where id = ad_id)
);


-- 8. Boost Transactions
create policy "Users can view their own transactions." on public.boost_transactions for select using (auth.uid() = user_id);
create policy "Users can insert their own transactions." on public.boost_transactions for insert with check (auth.uid() = user_id);


-- Policies para Almacenamiento (Storage)

-- Avatars
create policy "Avatar images are publicly accessible." on storage.objects for select using (bucket_id = 'avatars');
create policy "Anyone can upload an avatar." on storage.objects for insert with check (bucket_id = 'avatars');
create policy "Users can update their own avatar." on storage.objects for update using (auth.uid() = owner) with check (bucket_id = 'avatars');

-- Ad Media
create policy "Ad media is publicly accessible." on storage.objects for select using (bucket_id = 'ad_media');
create policy "Authenticated users can upload ad media." on storage.objects for insert with check (bucket_id = 'ad_media' and auth.role() = 'authenticated');
create policy "Users can delete their own ad media." on storage.objects for delete using (auth.uid() = owner);


-- INSERCIÓN DE DATOS DE EJEMPLO (SEED DATA)
-- Puedes añadir más según tus necesidades

-- Categorías
insert into public.categories (name) values
('Scorts'),
('Chicas Trans'),
('Scorts Gay'),
('Servicios Virtuales');

-- Ubicaciones (Países -> Regiones -> Ciudades)
DO $$
DECLARE
    colombia_id integer;
    antioquia_id integer;
    spain_id integer;
    madrid_region_id integer;
BEGIN
    -- Insertar Países y obtener sus IDs
    insert into public.locations (name, type, code, phone_code) values ('Colombia', 'country', 'CO', '57') returning id into colombia_id;
    insert into public.locations (name, type, code, phone_code) values ('España', 'country', 'ES', '34') returning id into spain_id;

    -- Insertar Regiones usando los IDs de países
    insert into public.locations (name, type, parent_id) values ('Antioquia', 'region', colombia_id) returning id into antioquia_id;
    insert into public.locations (name, type, parent_id) values ('Comunidad de Madrid', 'region', spain_id) returning id into madrid_region_id;

    -- Insertar Ciudades/Subregiones usando los IDs de regiones
    insert into public.locations (name, type, parent_id) values ('Medellín', 'subregion', antioquia_id);
    insert into public.locations (name, type, parent_id) values ('Madrid', 'subregion', madrid_region_id);
END $$;
