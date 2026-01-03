# Configuración de la Base de Datos Supabase

Este directorio contiene el script SQL necesario para configurar la base de datos y el almacenamiento para la plataforma de anuncios clasificados.

## Cómo Usar el Script

1.  **Navega al Editor SQL en Supabase:**
    *   Abre tu proyecto en [Supabase](https://app.supabase.io).
    *   En el menú de la izquierda, haz clic en el ícono de **SQL Editor**.
    *   Haz clic en **New query** o abre una pestaña de consulta existente.

2.  **Copia y Pega el Contenido:**
    *   Abre el archivo `schema.sql` de este directorio.
    *   Copia todo el contenido del archivo.
    *   Pega el contenido en la ventana del editor SQL de Supabase.

3.  **Ejecuta el Script:**
    *   Haz clic en el botón **Run** (o presiona `Cmd+Enter` / `Ctrl+Enter`).

4.  **Verificación:**
    *   Una vez que el script se ejecute correctamente, verás un mensaje de "Success. No rows returned".
    *   Puedes verificar que las tablas (`profiles`, `ads`, `categories`, `locations`) y los buckets de almacenamiento (`avatars`, `ad_images`) se han creado navegando a las secciones **Table Editor** y **Storage**, respectivamente.

## ¿Qué hace este script?

- **Crea los Tipos de Datos:** Define los `ENUM` para `user_role` y `ad_status` para garantizar la consistencia.
- **Define las Tablas:** Crea las tablas `profiles`, `categories`, `locations` y `ads` con las columnas y relaciones correctas.
- **Automatiza la Creación de Perfiles:** Implementa una función y un trigger (`handle_new_user`) que crea automáticamente un perfil de usuario cuando un nuevo usuario se registra en `auth.users`.
- **Configura el Almacenamiento:** Crea los buckets `avatars` y `ad_images` para almacenar las imágenes.
- **Establece la Seguridad:** Activa la Seguridad a Nivel de Fila (RLS) y define políticas de acceso detalladas para todas las tablas y buckets de almacenamiento. Esto es crucial para proteger los datos de los usuarios.
