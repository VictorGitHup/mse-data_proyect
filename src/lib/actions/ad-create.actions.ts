
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const adSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  category_id: z.coerce.number().int().positive('Debes seleccionar una categoría.'),
  country_id: z.coerce.number().int().positive('Debes seleccionar un país.'),
  region_id: z.coerce.number().int().positive('Debes seleccionar una región.'),
  subregion_id: z.coerce.number().int().optional(),
});

export async function createAd(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/auth/login?next=/ads/create');
  }
  
  const rawFormData = Object.fromEntries(formData.entries());

  const validatedFields = adSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return redirect(`/ads/create?error=${encodeURIComponent(firstError || 'Datos de formulario inválidos.')}`);
  }

  const { title, description, category_id, country_id, region_id, subregion_id } = validatedFields.data;

  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  try {
    const { error: insertError } = await supabase.from('ads').insert({
      user_id: user.id,
      title,
      description,
      category_id,
      country_id,
      region_id,
      subregion_id: subregion_id || null,
      slug: `${slug}-${Date.now().toString().slice(-6)}`,
      status: 'active', // Default status
    });

    if (insertError) {
      throw insertError;
    }

  } catch (error: any) {
    console.error('Error creating ad:', error);
    return redirect(`/ads/create?error=${encodeURIComponent('Error al crear el anuncio. ' + error.message)}`);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
