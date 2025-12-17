
// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Para Server Components (con await)
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// Para Server Actions y Route Handlers (sin await)
export function createSupabaseServerActionClient() {
  // En Server Actions, cookies() es síncrono
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // En Server Actions, set puede fallar silenciosamente
            // Esto es normal y se puede ignorar
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // En Server Actions, remove puede fallar silenciosamente
            // Esto es normal y se puede ignorar
          }
        },
      },
    }
  );
}

// Opcional: Función de conveniencia para obtener el usuario actual en Server Components
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Opcional: Función de conveniencia para Server Actions
export async function getCurrentUserFromAction() {
  const supabase = createSupabaseServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
