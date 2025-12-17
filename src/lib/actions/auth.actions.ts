
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// --- Login Action ---
export async function login(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect(`/auth/login?message=Error: Las credenciales son inválidas.`);
  }
  
  // Redirect to a protected route or dashboard
  return redirect('/dashboard');
}

// --- Logout Action ---
export async function logout() {
    const supabase = createSupabaseServerActionClient();
    await supabase.auth.signOut();
    redirect('/');
}

// --- Register Action ---
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  full_name: z.string().min(2).max(100),
  role: z.enum(['USER', 'ADVERTISER']),
});

export async function register(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const rawData = Object.fromEntries(formData);
  
  const validation = registerSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: "Los datos proporcionados son inválidos. Por favor, revisa el formulario." };
  }

  const { email, password, ...profileData } = validation.data;

  // Check if username is already taken (server-side)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', profileData.username)
    .maybeSingle();

  if (existingProfile) {
    return { error: `El nombre de usuario "${profileData.username}" ya está en uso.` };
  }

  // Create user in auth.users
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // These fields will be passed to the trigger that creates the profile
        full_name: profileData.full_name,
        username: profileData.username,
        role: profileData.role,
      }
    }
  });

  if (authError) {
    return { error: `Error al crear el usuario: ${authError.message}` };
  }

  if (authData.user) {
    const redirectTo = profileData.role === 'ADVERTISER' ? '/dashboard' : '/';
    redirect(`${redirectTo}?welcome=true`);
  }

  // This part is unlikely to be reached but good for safety
  return { error: "Ocurrió un error inesperado durante el registro." };
}

// --- Username Check Action ---
export async function checkUsername(username: string): Promise<boolean> {
  if (username.length < 3) return false;

  const supabase = createSupabaseServerActionClient();
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();
    
  return !data; // True if username is available
}
