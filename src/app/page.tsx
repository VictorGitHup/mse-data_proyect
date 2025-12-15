
'use client';

// Este componente sirve como una guía para configurar la base de datos en Supabase.
// Muestra el código SQL necesario para crear las tablas y las relaciones.
export default function Home() {
  const sqlScript = `
-- 1. Tabla de Usuarios (Users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADVERTISER')),
    username VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    age_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de Categorías (Categories)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- 3. Tabla de Anuncios (Ads)
CREATE TABLE ads (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location_country VARCHAR(100),
    location_department VARCHAR(100),
    location_city VARCHAR(100),
    active BOOLEAN DEFAULT true,
    premium_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabla de Etiquetas (Tags)
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- 5. Tabla de Unión para Anuncios y Etiquetas (Ad_Tags)
CREATE TABLE ad_tags (
    ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (ad_id, tag_id)
);

-- 6. Tabla de Calificaciones (Ratings)
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
    comment TEXT,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabla de Pagos (Payments)
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    ad_id INTEGER REFERENCES ads(id),
    stripe_session_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Habilitar Políticas de Seguridad a Nivel de Fila (RLS) para todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 9. Políticas de acceso (Ejemplo: permitir lectura pública para anuncios y categorías)
CREATE POLICY "Allow public read access to ads" ON ads FOR SELECT USING (true);
CREATE POLICY "Allow public read access to categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to tags" ON tags FOR SELECT USING (true);

-- 10. Datos iniciales (Seed)
INSERT INTO categories (name, slug) VALUES
('Escorts', 'escorts'),
('Servicios Virtuales', 'servicios-virtuales'),
('Escorts Gay', 'escorts-gay');

INSERT INTO tags (name) VALUES
('morena'),
('alta'),
('baja'),
('rubia'),
('delgada');
  `;

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
          Configuración de la Base de Datos
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed mt-2">
          Copia y ejecuta el siguiente script SQL en el Editor de SQL de tu proyecto de Supabase para crear todas las tablas, relaciones y datos iniciales.
        </p>
      </header>

      <div className="relative">
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm border">
          <code>
            {sqlScript.trim()}
          </code>
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(sqlScript.trim())}
          className="absolute top-2 right-2 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-md text-sm"
        >
          Copiar
        </button>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-2xl font-semibold">¿Qué sigue?</h2>
        <p className="text-muted-foreground mt-2">
          Una vez que las tablas estén creadas, podemos empezar a construir la interfaz para interactuar con ellas.
        </p>
      </div>
    </main>
  );
}
