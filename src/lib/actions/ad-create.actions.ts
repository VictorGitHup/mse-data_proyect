
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const adSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  category_id: z.coerce.number().int().positive('Debes seleccionar una categoría.'),
  country_id: z.coerce.number().int().positive('Debes seleccionar un país.'),
  region_id: z.coerce.number().int().positive('Debes seleccionar una región.'),
  subregion_id: z.coerce.number().int().optional(),
  image: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `El tamaño máximo de la imagen es 5MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    ),
});

export async function createAd(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/auth/login?next=/ads/create');
  }
  
  const rawFormData = Object.fromEntries(formData.entries());

  // Handle file separately for validation
  const validatedFields = adSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return redirect(`/ads/create?error=${encodeURIComponent(firstError || 'Datos de formulario inválidos.')}`);
  }

  const { image, ...adData } = validatedFields.data;

  try {
    // 1. Upload image to Supabase Storage
    const fileExt = image.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('ad_images')
      .upload(filePath, image);

    if (uploadError) {
      console.error('Image upload error:', uploadError);
      throw new Error('Error al subir la imagen. Inténtalo de nuevo.');
    }

    // 2. Get public URL of the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('ad_images')
      .getPublicUrl(filePath);
      
    if (!publicUrl) {
      throw new Error('No se pudo obtener la URL de la imagen.');
    }

    // 3. Create the ad in the database with the image URL
    const slug = adData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { error: insertError } = await supabase.from('ads').insert({
      user_id: user.id,
      title: adData.title,
      description: adData.description,
      category_id: adData.category_id,
      country_id: adData.country_id,
      region_id: adData.region_id,
      subregion_id: adData.subregion_id || null,
      image_url: publicUrl,
      slug: `${slug}-${Date.now().toString().slice(-6)}`,
      status: 'active', // Default status
    });

    if (insertError) {
      throw insertError;
    }

  } catch (error: any) {
    console.error('Error creating ad:', error);
    let errorMessage = 'Error al crear el anuncio.';
    if (error.message) {
      errorMessage += ' ' + error.message;
    }
    return redirect(`/ads/create?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
