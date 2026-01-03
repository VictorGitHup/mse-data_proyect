
# Plataforma de Anuncios Clasificados

Esta es una aplicación web full-stack construida con Next.js y Supabase que permite a los usuarios registrarse, publicar y gestionar anuncios clasificados. La plataforma distingue entre usuarios estándar y anunciantes, ofreciendo un dashboard dedicado para la gestión de publicaciones.

## Stack Tecnológico

- **Framework:** [Next.js](https://nextjs.org/) (con App Router, Server Components y Server Actions)
- **Base de Datos y Autenticación:** [Supabase](https://supabase.io/)
- **UI:** [React](https://react.dev/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI:** [ShadCN/UI](https://ui.shadcn.com/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)

---

## Puesta en Marcha del Proyecto

### 1. Prerrequisitos

- Node.js (versión 18 o superior)
- `pnpm` como gestor de paquetes (recomendado)

### 2. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd <nombre-del-repositorio>
```

### 3. Instalar Dependencias

```bash
pnpm install
```

### 4. Configuración de Supabase

El proyecto requiere una instancia de Supabase para la base de datos y la autenticación.

#### Tablas Requeridas:

Asegúrate de que tu base de datos en Supabase tenga las siguientes tablas:

- **`profiles`**: Almacena datos públicos del usuario.
  - `id` (uuid, FK a `auth.users.id`, PK)
  - `username` (text, unique)
  - `full_name` (text)
  - `avatar_url` (text, nullable)
  - `role` (enum `user_role` con valores 'USER', 'ADVERTISER')
  - `updated_at` (timestamptz, nullable)

- **`ads`**: Almacena los anuncios.
  - `id` (bigint, PK)
  - `user_id` (uuid, FK a `auth.users.id`)
  - `title` (text)
  - `description` (text)
  - `category_id` (int, FK a `categories.id`)
  - `country_id`, `region_id`, `subregion_id` (int, FK a `locations.id`)
  - `status` (enum con valores 'active', 'inactive', 'draft', 'expired')
  - `created_at`, `updated_at` (timestamptz)

- **`locations`** y **`categories`**: Tablas para almacenar datos maestros.

#### Trigger de Creación de Perfil:

Es crucial tener un trigger en la base de datos que cree automáticamente un perfil de usuario cuando un nuevo usuario se registra.

1.  Ve a `Database` > `Triggers` en tu panel de Supabase.
2.  Crea una nueva función y un trigger con el siguiente código SQL:

```sql
-- Función para insertar una fila en public.profiles
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

-- Trigger que ejecuta la función cada vez que se crea un usuario
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 5. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto y añade las siguientes variables, reemplazando los valores con tus propias claves de Supabase:

```env
# Claves de Supabase (Encuéntralas en Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://<project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<tu-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<tu-service-role-key-secreta>"

# URL de la aplicación en desarrollo
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 6. Iniciar el Servidor de Desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

---

## Casos de Uso y Flujos Funcionales

### 1. Registro de Usuario

- **Objetivo:** Permitir que nuevos usuarios creen una cuenta, eligiendo entre un rol de "Usuario Estándar" o "Anunciante".
- **Flujo:**
  1.  El usuario navega a la página de registro (`/auth/register`).
  2.  **Paso 1:** Completa sus datos básicos: correo, contraseña, nombre de usuario y nombre completo. El sistema verifica en tiempo real que el nombre de usuario no esté en uso.
  3.  **Paso 2:** Selecciona un rol:
      - **Usuario Estándar:** Para navegar y ver anuncios.
      - **Anunciante:** Para poder crear y gestionar anuncios.
  4.  Acepta los términos y condiciones y finaliza el registro.
  5.  El sistema envía un correo de confirmación a la dirección proporcionada.
  6.  El usuario es redirigido a la página de login con un mensaje instruyéndole a revisar su correo.
- **Lógica Clave:** La creación del perfil en la tabla `profiles` es automatizada por un trigger en Supabase que se activa después de la inserción en `auth.users`.

### 2. Inicio de Sesión

- **Objetivo:** Autenticar a un usuario y darle acceso a la plataforma según su rol.
- **Flujo:**
  1.  El usuario navega a `/auth/login`.
  2.  Introduce su correo y contraseña.
  3.  El sistema valida las credenciales con Supabase.
  4.  Si la autenticación es exitosa, el sistema consulta el rol del usuario en la tabla `profiles`.
  5.  **Redirección basada en rol:**
      - Si el rol es `ADVERTISER`, es redirigido a su panel de control (`/dashboard`).
      - Si el rol es `USER`, es redirigido a la página principal (`/`).
  6.  Si las credenciales son incorrectas o la cuenta no está confirmada, se muestra un mensaje de error.

### 3. Gestión de Anuncios (Rol: Anunciante)

#### a. Visualización y Filtrado (Dashboard)

- **Objetivo:** Proporcionar al anunciante una vista centralizada y eficiente para gestionar todos sus anuncios.
- **Flujo:**
  1.  El anunciante inicia sesión y es redirigido a `/dashboard`.
  2.  Se muestra una tabla con todos sus anuncios, con las siguientes columnas: Título, Categoría, Estado, Fecha de Creación.
  3.  El estado se representa con un `Badge` de color para una identificación rápida (Ej: verde para 'Activo', gris para 'Inactivo').
  4.  El usuario puede buscar anuncios por título y filtrar por estado usando los controles situados encima de la tabla.

#### b. Creación de un Anuncio

- **Objetivo:** Permitir a un anunciante publicar un nuevo anuncio.
- **Flujo:**
  1.  Desde el dashboard, hace clic en "Crear Nuevo Anuncio".
  2.  Es redirigido al formulario en `/ads/create`.
  3.  Completa los campos: Título, Descripción, Categoría y Ubicación (País, Región, Subregión).
  4.  Las listas de ubicaciones son dinámicas y se actualizan según la selección anterior.
  5.  Al enviar, la Server Action `createAd` valida los datos, busca los IDs de las ubicaciones y crea el nuevo registro en la tabla `ads`.
  6.  El usuario es redirigido de vuelta al dashboard, donde ve su nuevo anuncio listado.

#### c. Edición de un Anuncio

- **Objetivo:** Permitir al anunciante modificar un anuncio existente.
- **Flujo:**
  1.  En la tabla del dashboard, hace clic en "Gestionar" en la fila del anuncio que desea editar.
  2.  Es redirigido a `/dashboard/ads/[id]/manage`.
  3.  La página carga los datos del anuncio específico desde Supabase.
  4.  Se muestra un formulario de edición precargado con la información actual del anuncio.
  5.  El usuario modifica los campos deseados y guarda los cambios.
  6.  La Server Action `updateAd` valida y actualiza el registro en Supabase.
  7.  El usuario es redirigido de vuelta al dashboard.

#### d. Cambiar Estado de un Anuncio (Activar/Desactivar)

- **Objetivo:** Permitir al anunciante pausar o reactivar un anuncio rápidamente.
- **Flujo:**
  1.  En la tabla del dashboard, cada anuncio tiene un interruptor (`Switch`) que indica su estado (Activo/Inactivo).
  2.  El anunciante hace clic en el interruptor.
  3.  Una Server Action (`toggleAdStatus`) se ejecuta en segundo plano para actualizar el estado del anuncio en la base de datos, sin recargar la página.
  4.  El estado del interruptor se actualiza visualmente y se muestra una notificación (`Toast`) confirmando el cambio.
