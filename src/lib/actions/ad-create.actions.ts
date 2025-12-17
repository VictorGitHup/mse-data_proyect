
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const adSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  category_id: z.coerce.number().int().positive('Debes seleccionar una categoría.'),
  country: z.string().min(1, 'Debes seleccionar un país.'),
  region: z.string().min(1, 'Debes seleccionar una región.'),
  subregion: z.string().optional(),
});

export async function createAd(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/auth/login?next=/ads/create');
  }
  
  const rawFormData = Object.fromEntries(formData.entries());
  console.log('Raw form data:', rawFormData);

  const validatedFields = adSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return redirect(`/ads/create?error=${encodeURIComponent(firstError || 'Datos de formulario inválidos.')}`);
  }

  const { title, description, category_id, country, region, subregion } = validatedFields.data;

  // El slug se podría generar a partir del título para URLs amigables
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  try {
    const { data: countryData, error: countryError } = await supabase.from('locations').select('id').eq('name', country).eq('type', 'country').single();
    if (countryError || !countryData) throw new Error(`País no encontrado: ${country}`);

    const { data: regionData, error: regionError } = await supabase.from('locations').select('id').eq('name', region).eq('type', 'region').eq('parent_id', countryData.id).single();
    if (regionError || !regionData) throw new Error(`Región no encontrada: ${region}`);
    
    let subregionId = null;
    if (subregion) {
      const { data: subregionData, error: subregionError } = await supabase.from('locations').select('id').eq('name', subregion).eq('type', 'subregion').eq('parent_id', regionData.id).single();
      if (subregionError || !subregionData) throw new Error(`Subregión no encontrada: ${subregion}`);
      subregionId = subregionData.id;
    }

    const { error: insertError } = await supabase.from('ads').insert({
      user_id: user.id,
      title,
      description,
      category_id,
      country_id: countryData.id,
      region_id: regionData.id,
      subregion_id: subregionId,
      slug: `${slug}-${Date.now().toString().slice(-6)}`,
      status: 'active',
    });

    if (insertError) {
      throw insertError;
    }

  } catch (error: any) {
    console.error('Error creating ad:', error);
    return redirect(`/ads/create?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
