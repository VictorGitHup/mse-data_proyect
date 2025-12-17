
'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// --- Login Action ---
export async function login(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    if (authError?.message.includes("Email not confirmed")) {
        return redirect(`/auth/login?message=Por favor, confirma tu correo electrónico para iniciar sesión.`);
    }
    // Note: The "Ã¡" is a character encoding issue for "á".
    return redirect(`/auth/login?message=Error: Las credenciales son inválidas.`);
  }
  
  // --- Role-based redirection logic ---
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
      // If profile doesn't exist for some reason, sign out and show an error
      await supabase.auth.signOut();
      return redirect(`/auth/login?message=Error: No se pudo encontrar el perfil de usuario.`);
  }

  // Redirect based on the user's role
  if (profile.role === 'ADVERTISER') {
    return redirect('/dashboard');
  } else {
    return redirect('/');
  }
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

  const { email, password, username, full_name, role } = validation.data;

  // Check if username is already taken (server-side)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existingProfile) {
    return { error: `El nombre de usuario "${username}" ya está en uso.` };
  }
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name,
        role,
      }
    }
  });

  if (authError) {
    if (authError.message.includes('User already registered')) {
        const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });

        if (resendError) {
            return { error: `El correo electrónico "${email}" ya está registrado.` };
        }

        return redirect('/auth/login?message=Ya existe una cuenta con este correo. Hemos reenviado el email de confirmación.');
    }
    return { error: `Error al crear el usuario: ${authError.message}` };
  }
  
  if (!authData.user) {
    return { error: "No se pudo crear el usuario, por favor intenta de nuevo." };
  }

  // Redirect to a page that tells the user to check their email.
  redirect('/auth/login?message=¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.');
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
