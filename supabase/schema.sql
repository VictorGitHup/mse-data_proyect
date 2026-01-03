
-- ### Tipos ###
-- Enum para roles de usuario
CREATE TYPE public.user_role AS ENUM (
    'USER',
    'ADVERTISER'
);

-- Enum para el estado de los anuncios
CREATE TYPE public.ad_status AS ENUM (
    'active',
    'inactive',
    'draft',
    'expired'
);

-- Enum para el estado de los comentarios
CREATE TYPE public.comment_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- ### Tablas ###

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
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
COMMENT ON TABLE public.profiles IS 'Almacena datos públicos del perfil de un usuario.';
COMMENT ON COLUMN public.profiles.id IS 'Referencia a auth.users.id';

-- Tabla de categorías
CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name text NOT NULL UNIQUE
);
COMMENT ON TABLE public.categories IS 'Almacena las categorías de los anuncios.';

-- Tabla de ubicaciones
CREATE TABLE public.locations (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL, -- 'country', 'region', 'subregion'
    parent_id INTEGER REFERENCES public.locations(id),
    code text -- Opcional: para códigos ISO, DANE, etc.
);
COMMENT ON TABLE public.locations IS 'Almacena ubicaciones geográficas jerárquicas.';

-- Tabla de anuncios
CREATE TABLE public.ads (
    id BIGSERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    category_id INTEGER NOT NULL REFERENCES public.categories(id),
    country_id INTEGER REFERENCES public.locations(id),
    region_id INTEGER REFERENCES public.locations(id),
    subregion_id INTEGER REFERENCES public.locations(id),
    status ad_status NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    video_url text,
    boosted_until timestamptz,
    slug text UNIQUE
);
COMMENT ON TABLE public.ads IS 'Almacena los anuncios clasificados.';

-- Tabla para media (imágenes/videos) de anuncios
CREATE TABLE public.ad_media (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url text NOT NULL,
    type text NOT NULL DEFAULT 'image', -- 'image', 'video'
    is_cover boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ad_media IS 'Almacena imágenes y videos asociados a un anuncio.';

-- Tabla de calificaciones (ratings)
CREATE TABLE public.ratings (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (ad_id, user_id) -- Un usuario solo puede calificar un anuncio una vez
);
COMMENT ON TABLE public.ratings IS 'Almacena las calificaciones de los anuncios.';

-- Tabla de comentarios
CREATE TABLE public.comments (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment text NOT NULL,
    status comment_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.comments IS 'Almacena los comentarios en los anuncios.';

-- Tabla de transacciones de potenciación
CREATE TABLE public.boost_transactions (
    id BIGSERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    duration_days INTEGER NOT NULL,
    amount_paid NUMERIC(10, 2), -- Opcional, para registrar el monto
    payment_processor TEXT, -- Ej: 'stripe', 'paypal'
    transaction_id TEXT, -- ID de la transacción del procesador de pagos
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.boost_transactions IS 'Registra las transacciones de potenciación de anuncios.';


-- ### Automatización y Triggers ###

-- Función para insertar una fila en public.profiles
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

-- Trigger que ejecuta la función cada vez que se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ### Almacenamiento (Storage) ###
-- Bucket para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Bucket para media de anuncios (imágenes/videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ad_media', 'ad_media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;


-- ### Políticas de Seguridad (Row Level Security) ###

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles (profiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Políticas para anuncios (ads)
DROP POLICY IF EXISTS "Ads are viewable by everyone." ON public.ads;
CREATE POLICY "Ads are viewable by everyone."
    ON public.ads FOR SELECT
    USING (status = 'active');

DROP POLICY IF EXISTS "Advertisers can insert their own ads." ON public.ads;
CREATE POLICY "Advertisers can insert their own ads."
    ON public.ads FOR INSERT
    WITH CHECK (auth.uid() = user_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER');

DROP POLICY IF EXISTS "Advertisers can update their own ads." ON public.ads;
CREATE POLICY "Advertisers can update their own ads."
    ON public.ads FOR UPDATE
    USING (auth.uid() = user_id);
    
DROP POLICY IF EXISTS "Advertisers can delete their own ads." ON public.ads;
CREATE POLICY "Advertisers can delete their own ads."
    ON public.ads FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own non-active ads" ON public.ads;
CREATE POLICY "Users can view their own non-active ads"
    ON public.ads FOR SELECT
    USING (auth.uid() = user_id);

-- Políticas para media de anuncios (ad_media)
DROP POLICY IF EXISTS "Ad media is viewable by everyone." ON public.ad_media;
CREATE POLICY "Ad media is viewable by everyone."
    ON public.ad_media FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Advertisers can insert media for their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can insert media for their own ads."
    ON public.ad_media FOR INSERT
    WITH CHECK (auth.uid() = user_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADVERTISER');
    
DROP POLICY IF EXISTS "Advertisers can update media for their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can update media for their own ads."
    ON public.ad_media FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can delete media for their own ads." ON public.ad_media;
CREATE POLICY "Advertisers can delete media for their own ads."
    ON public.ad_media FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para categorías y ubicaciones (solo lectura para todos)
DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone."
    ON public.categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Locations are viewable by everyone." ON public.locations;
CREATE POLICY "Locations are viewable by everyone."
    ON public.locations FOR SELECT
    USING (true);

-- Políticas para calificaciones (ratings)
DROP POLICY IF EXISTS "Ratings are viewable by everyone." ON public.ratings;
CREATE POLICY "Ratings are viewable by everyone."
    ON public.ratings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert ratings." ON public.ratings;
CREATE POLICY "Authenticated users can insert ratings."
    ON public.ratings FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id AND user_id <> (SELECT user_id FROM ads WHERE id = ad_id));

DROP POLICY IF EXISTS "Users can update their own rating." ON public.ratings;
CREATE POLICY "Users can update their own rating."
    ON public.ratings FOR UPDATE
    USING (auth.uid() = user_id);
    
DROP POLICY IF EXISTS "Users can delete their own rating." ON public.ratings;
CREATE POLICY "Users can delete their own rating."
    ON public.ratings FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para comentarios (comments)
DROP POLICY IF EXISTS "Approved comments are viewable by everyone." ON public.comments;
CREATE POLICY "Approved comments are viewable by everyone."
    ON public.comments FOR SELECT
    USING (status = 'approved');
    
DROP POLICY IF EXISTS "Users can view their own comments." ON public.comments;
CREATE POLICY "Users can view their own comments."
    ON public.comments FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can view all comments on their ads." ON public.comments;
CREATE POLICY "Advertisers can view all comments on their ads."
    ON public.comments FOR SELECT
    USING (auth.uid() = (SELECT user_id FROM ads WHERE id = ad_id));
    
DROP POLICY IF EXISTS "Authenticated users can insert comments." ON public.comments;
CREATE POLICY "Authenticated users can insert comments."
    ON public.comments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id AND user_id <> (SELECT user_id FROM ads WHERE id = ad_id));
    
DROP POLICY IF EXISTS "Users can delete their own comments." ON public.comments;
CREATE POLICY "Users can delete their own comments."
    ON public.comments FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Advertisers can moderate comments on their ads." ON public.comments;
CREATE POLICY "Advertisers can moderate comments on their ads."
    ON public.comments FOR UPDATE
    USING (auth.uid() = (SELECT user_id FROM ads WHERE id = ad_id))
    WITH CHECK (auth.uid() = (SELECT user_id FROM ads WHERE id = ad_id));

-- Políticas para transacciones (boost_transactions)
DROP POLICY IF EXISTS "Users can only see their own transactions." ON public.boost_transactions;
CREATE POLICY "Users can only see their own transactions."
    ON public.boost_transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own boost transactions." ON public.boost_transactions;
CREATE POLICY "Users can insert their own boost transactions."
    ON public.boost_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
    
-- Políticas para el almacenamiento (Storage)
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar."
    ON storage.objects FOR UPDATE
    USING (auth.uid() = owner)
    WITH CHECK (bucket_id = 'avatars');
    
DROP POLICY IF EXISTS "Ad media is publicly accessible." ON storage.objects;
CREATE POLICY "Ad media is publicly accessible."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'ad_media');

DROP POLICY IF EXISTS "Advertisers can upload media." ON storage.objects;
CREATE POLICY "Advertisers can upload media."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'ad_media' AND auth.uid() = (SELECT user_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADVERTISER'));
    
DROP POLICY IF EXISTS "Advertisers can update their own media." ON storage.objects;
CREATE POLICY "Advertisers can update their own media."
    ON storage.objects FOR UPDATE
    USING (auth.uid() = owner);

DROP POLICY IF EXISTS "Advertisers can delete their own media." ON storage.objects;
CREATE POLICY "Advertisers can delete their own media."
    ON storage.objects FOR DELETE
    USING (auth.uid() = owner);
