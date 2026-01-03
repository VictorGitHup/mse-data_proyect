
# Plataforma de Anuncios Clasificados

Esta es una aplicación web full-stack construida con Next.js y Supabase que permite a los usuarios registrarse, publicar y gestionar anuncios clasificados. La plataforma distingue entre usuarios estándar y anunciantes, ofreciendo un dashboard dedicado para la gestión de publicaciones.

## Stack Tecnológico

- **Framework:** [Next.js](https://nextjs.org/) (con App Router, Server Components y Server Actions)
- **Base de Datos, Autenticación y Almacenamiento:** [Supabase](https://supabase.io/)
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

El archivo `supabase/schema.sql` contiene toda la configuración necesaria para la base de datos y el almacenamiento.

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
  - ✅ **Ver Perfiles Públicos:** Puede ver la información pública de los perfiles (nombre de usuario, avatar, información de contacto).
  - ✅ **Ver Contenido Multimedia:** Puede ver imágenes y videos de anuncios, así como avatares.
  - ✅ **Ver Calificaciones y Comentarios:** Puede leer las calificaciones y los comentarios `aprobados` en los anuncios.
- **Restricciones:**
  - ❌ No puede crear, editar o eliminar ningún dato.
  - ❌ No puede ver anuncios en estado `draft`, `inactive` o `expired`.
  - ❌ No puede calificar ni comentar.

### 2. Usuario Estándar (Rol: `USER`)

Hereda todos los permisos del visitante anónimo y además puede interactuar con la plataforma.

- **Capacidades:**
  - ✅ **Gestionar su Perfil:** Puede actualizar su propio nombre completo, nombre de usuario y avatar.
  - ✅ **Calificar Anuncios:** Puede añadir o actualizar su propia calificación (1-5 estrellas) en cualquier anuncio.
  - ✅ **Comentar Anuncios:** Puede publicar comentarios en los anuncios. Estos comentarios comenzarán en estado `pending`.
  - ✅ **Gestionar sus Comentarios:** Puede eliminar sus propios comentarios.
- **Restricciones:**
  - ❌ No puede crear, editar o eliminar anuncios.
  - ❌ No puede moderar (aprobar/rechazar) comentarios de otros.
  - ❌ No puede añadir información de contacto público de anunciante.

### 3. Anunciante (Rol: `ADVERTISER`)

Es el rol con más privilegios, centrado en la creación y gestión de contenido. Hereda los permisos del Usuario Estándar y además:

- **Capacidades:**
  - ✅ **Gestionar Perfil de Anunciante:** Puede añadir y actualizar su información de contacto público (email, WhatsApp, Telegram, etc.).
  - ✅ **Crear Anuncios:** Puede publicar nuevos anuncios con imágenes y videos.
  - ✅ **Gestionar sus Anuncios:** Puede ver, editar, activar/desactivar y eliminar **únicamente sus propios anuncios**.
  - ✅ **Gestionar Multimedia de Anuncios:** Puede subir, cambiar y eliminar imágenes y videos asociados **a sus propios anuncios**.
  - ✅ **Moderar Comentarios:** Puede ver todos los comentarios en sus anuncios (pendientes, aprobados, rechazados) y puede **actualizar su estado** (ej. aprobar un comentario pendiente).
- **Restricciones:**
  - ❌ No puede modificar los anuncios de otros anunciantes.
  - ❌ No puede calificar ni comentar sus propios anuncios.

    