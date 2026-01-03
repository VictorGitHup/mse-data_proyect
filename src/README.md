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

El proyecto requiere una instancia de Supabase para la base de datos, autenticación y almacenamiento.

#### a. Ejecutar el Script de Schema

El archivo `supabase/schema.sql` contiene toda la configuración necesaria.

1.  Ve al **SQL Editor** en tu panel de Supabase.
2.  Crea una **New query**.
3.  Copia y pega el contenido completo de `supabase/schema.sql`.
4.  Haz clic en **Run**.

Esto creará las tablas, los roles, el almacenamiento y, lo más importante, las **Políticas de Seguridad a Nivel de Fila (RLS)**.

#### b. Trigger de Creación de Perfil

El script anterior ya incluye la función y el trigger necesarios (`handle_new_user`). Esto automatiza la creación de un perfil de usuario en la tabla `public.profiles` cada vez que un nuevo usuario se registra en `auth.users`.

### 5. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto y añade las siguientes variables, reemplazando los valores con tus propias claves de Supabase:

```env
# Claves de Supabase (Encuéntralas en Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://<project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<tu-anon-key>"

# URL de la aplicación en desarrollo
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 6. Iniciar el Servidor de Desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

---

## Casos de Uso y Permisos por Rol

El sistema se basa en un conjunto de Políticas de Seguridad a Nivel de Fila (RLS) en Supabase que dictan qué puede hacer cada usuario.

### 1. Visitante Anónimo (No autenticado)

- **Capacidades:**
  - ✅ **Ver Anuncios:** Puede explorar y ver todos los anuncios cuyo estado sea `active`.
  - ✅ **Ver Perfiles:** Puede ver la información pública de los perfiles de los usuarios (nombre de usuario, etc.).
  - ✅ **Ver Imágenes:** Puede ver las imágenes de avatares y anuncios.
- **Restricciones:**
  - ❌ No puede crear, editar o eliminar ningún dato.
  - ❌ No puede ver anuncios en estado `draft`, `inactive` o `expired`.

### 2. Usuario Estándar (Rol: `USER`)

Hereda todos los permisos del visitante anónimo y además puede gestionar su propia identidad.

- **Capacidades:**
  - ✅ **Gestionar su Perfil:** Puede actualizar su propio nombre completo, nombre de usuario y avatar.
- **Restricciones:**
  - ❌ No puede crear, editar o eliminar anuncios. El acceso al dashboard y a los formularios de creación está bloqueado por middleware.

### 3. Anunciante (Rol: `ADVERTISER`)

Es el rol con más privilegios, centrado en la creación y gestión de contenido. Hereda los permisos del Usuario Estándar y además:

- **Capacidades:**
  - ✅ **Crear Anuncios:** Puede publicar nuevos anuncios.
  - ✅ **Gestionar sus Anuncios:** Puede ver, editar, activar/desactivar y eliminar **únicamente sus propios anuncios**.
  - ✅ **Gestionar Imágenes de Anuncios:** Puede subir, cambiar y eliminar imágenes asociadas **a sus propios anuncios**.
- **Restricciones:**
  - ❌ No puede modificar los anuncios de otros anunciantes.

## Flujos Funcionales

### 1. Registro de Usuario

- **Objetivo:** Permitir que nuevos usuarios creen una cuenta, eligiendo entre un rol de "Usuario Estándar" o "Anunciante".
- **Flujo:**
  1.  El usuario navega a la página de registro (`/auth/register`).
  2.  **Paso 1:** Completa sus datos básicos (correo, contraseña, nombre de usuario). El sistema verifica en tiempo real que el nombre de usuario no esté en uso.
  3.  **Paso 2:** Selecciona un rol (`USER` o `ADVERTISER`).
  4.  Al enviar, `supabase.auth.signUp` se ejecuta. Los datos del perfil (username, role) se pasan como metadatos.
  5.  El **trigger `on_auth_user_created`** en Supabase se dispara y ejecuta la función `handle_new_user`, que crea la entrada correspondiente en la tabla `public.profiles`.
  6.  El usuario es redirigido a la página de login con un mensaje para que confirme su correo.

### 2. Inicio de Sesión

- **Objetivo:** Autenticar a un usuario y darle acceso a la plataforma según su rol.
- **Flujo:**
  1.  El usuario introduce su correo y contraseña en `/auth/login`.
  2.  La Server Action `login` valida las credenciales con Supabase.
  3.  Si la autenticación es exitosa, se consulta el rol del usuario en la tabla `profiles`.
  4.  **Redirección basada en rol:**
      - Rol `ADVERTISER` -> Redirigido a su panel de control (`/dashboard`).
      - Rol `USER` -> Redirigido a la página principal (`/`).

### 3. Gestión de Anuncios (Rol: Anunciante)

#### a. Visualización y Filtrado (Dashboard)

- **Objetivo:** Proporcionar al anunciante una vista centralizada para gestionar sus anuncios.
- **Flujo:**
  1.  El anunciante inicia sesión y es redirigido a `/dashboard`.
  2.  Se muestra una **tabla** con sus anuncios (Título, Categoría, Estado, Fecha de Creación).
  3.  El estado se representa con un `Badge` de color para una identificación rápida.
  4.  El usuario puede buscar anuncios por título y filtrar por estado.

#### b. Creación y Edición de Anuncios

- **Objetivo:** Permitir a un anunciante publicar o modificar un anuncio.
- **Flujo:**
  1.  Desde el dashboard, hace clic en "Crear Nuevo Anuncio" (redirige a `/ads/create`) o en "Gestionar" en un anuncio existente (redirige a `/dashboard/ads/[id]/manage`).
  2.  Completa o modifica los campos del formulario.
  3.  Al enviar, las Server Actions (`createAd` o `updateAd`) validan los datos y ejecutan la inserción o actualización en la tabla `ads`.
  4.  Gracias a RLS, la base de datos solo permite estas operaciones si el `user_id` coincide con el del usuario autenticado.
  5.  El usuario es redirigido de vuelta al dashboard.
