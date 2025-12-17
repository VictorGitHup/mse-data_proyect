
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
  subregion: z.string().optional(), // Es opcional ya que no todas las regiones tienen subregiones
});

export async function createAd(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/ads/create');
  }
  
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = adSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    // En una implementación real, deberíamos devolver estos errores al cliente.
    // Por ahora, lo mostraremos en la consola del servidor.
    console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
    // Podríamos redirigir con un mensaje de error genérico
    return redirect('/ads/create?error=ValidationFailed');
  }

  const { title, description, category_id, country, region, subregion } = validatedFields.data;

  // El slug se podría generar a partir del título para URLs amigables
  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const { error } = await supabase.from('ads').insert({
    user_id: user.id,
    title,
    description,
    category_id,
    // La base de datos espera IDs para las ubicaciones, pero estamos guardando nombres.
    // Esto es una simplificación temporal. En un sistema real, buscaríamos los IDs.
    country_name: country,
    region_name: region,
    subregion_name: subregion,
    slug: `${slug}-${Date.now().toString().slice(-6)}`, // Añadir un sufijo para unicidad
    active: true, // Lo activamos por defecto para simplificar
  });

  if (error) {
    console.error('Supabase error:', error);
    return redirect(`/ads/create?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
