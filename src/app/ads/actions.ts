
'use server';

import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const adSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  location_city: z.string().min(2, 'La ciudad debe tener al menos 2 caracteres.'),
  location_country: z.string().min(2, 'El país debe tener al menos 2 caracteres.'),
});

export type FormState = {
  message: string;
  errors?: Record<string, string[]>;
};

export async function createAd(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: 'Error de autenticación: No se encontró el usuario.',
      errors: {},
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'ADVERTISER') {
     return {
      message: 'Error de autorización: No tienes permiso para crear anuncios.',
      errors: {},
    };
  }

  const validatedFields = adSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: 'Error de validación. Por favor, revisa los campos.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, description, location_city, location_country } = validatedFields.data;

  const { error } = await supabase.from('ads').insert({
    user_id: user.id,
    title,
    description,
    location_city,
    location_country,
    // category_id y otros campos requeridos si los hay
    category_id: 1, // Usando un valor por defecto temporalmente, esto deberia ser un selector
  });

  if (error) {
    console.error('Supabase error:', error);
    return {
      message: 'Error en la base de datos: No se pudo crear el anuncio.',
      errors: {},
    };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function toggleAdStatus(adId: number, currentState: boolean) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // Verify the user owns the ad before updating
  const { data: ad, error: fetchError } = await supabase
    .from('ads')
    .select('user_id')
    .eq('id', adId)
    .single();

  if (fetchError || !ad) {
    throw new Error("Anuncio no encontrado.");
  }

  if (ad.user_id !== user.id) {
    throw new Error("No tienes permiso para modificar este anuncio.");
  }

  const { error } = await supabase
    .from('ads')
    .update({ active: !currentState })
    .eq('id', adId);

  if (error) {
    throw new Error("No se pudo actualizar el estado del anuncio.");
  }

  revalidatePath('/dashboard');
  revalidatePath('/'); // Also revalidate home page in case the ad was visible there
}
