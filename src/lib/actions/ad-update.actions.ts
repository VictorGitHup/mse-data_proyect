
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const adUpdateSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  category_id: z.coerce.number().int().positive('Debes seleccionar una categoría.'),
  country_id: z.coerce.number().int().positive('Debes seleccionar un país.'),
  region_id: z.coerce.number().int().positive('Debes seleccionar una región.'),
  subregion_id: z.coerce.number().int().optional(),
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

  const { title, description, category_id, country_id, region_id, subregion_id } = validatedFields.data;

  try {
    const { error: updateError } = await supabase
      .from('ads')
      .update({
        title,
        description,
        category_id,
        country_id,
        region_id,
        subregion_id: subregion_id || null,
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
