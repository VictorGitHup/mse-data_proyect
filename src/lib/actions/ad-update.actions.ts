
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const adUpdateSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  category_id: z.coerce.number().int().positive('Debes seleccionar una categoría.'),
  country: z.string().min(1, 'Debes seleccionar un país.'),
  region: z.string().min(1, 'Debes seleccionar una región.'),
  subregion: z.string().optional(),
});

export async function updateAd(adId: number, formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/auth/login?next=/dashboard/ads/${adId}/manage`);
  }
  
  const rawFormData = Object.fromEntries(formData.entries());

  const validatedFields = adUpdateSchema.safeParse(rawFormData);

  const errorRedirectUrl = `/dashboard/ads/${adId}/manage`;

  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return redirect(`${errorRedirectUrl}?error=${encodeURIComponent(firstError || 'Datos de formulario inválidos.')}`);
  }

  const { title, description, category_id, country, region, subregion } = validatedFields.data;

  try {
    const { data: countryData, error: countryError } = await supabase.from('locations').select('id').eq('name', country).eq('type', 'country').single();
    if (countryError || !countryData) throw new Error(`País no encontrado: ${country}`);

    const { data: regionData, error: regionError } = await supabase.from('locations').select('id').eq('name', region).eq('type', 'region').eq('parent_id', countryData.id).single();
    if (regionError || !regionData) throw new Error(`Región no encontrada: ${region}`);
    
    let subregionId = null;
    if (subregion && subregion.length > 0) {
      const { data: subregionData, error: subregionError } = await supabase.from('locations').select('id').eq('name', subregion).eq('type', 'subregion').eq('parent_id', regionData.id).single();
      if (subregionError || !subregionData) throw new Error(`Subregión no encontrada: ${subregion}`);
      subregionId = subregionData.id;
    }

    const { error: updateError } = await supabase
      .from('ads')
      .update({
        title,
        description,
        category_id,
        country_id: countryData.id,
        region_id: regionData.id,
        subregion_id: subregionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adId)
      .eq('user_id', user.id); // Security check: user can only update their own ads

    if (updateError) {
      throw updateError;
    }

  } catch (error: any) {
    console.error('Error updating ad:', error);
    return redirect(`${errorRedirectUrl}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/ads/${adId}/manage`);
  redirect('/dashboard');
}
