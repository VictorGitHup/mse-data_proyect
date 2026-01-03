
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
  images: z.array(z.instanceof(File))
    .min(1, 'Debes subir al menos una imagen.')
    .max(5, 'Puedes subir un máximo de 5 imágenes.')
    .refine(files => files.every(file => file.size <= MAX_FILE_SIZE), `Cada imagen debe pesar menos de 5MB.`)
    .refine(files => files.every(file => ACCEPTED_IMAGE_TYPES.includes(file.type)), "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."),
  cover_image_index: z.coerce.number().int().min(0).max(4),
});

export async function createAd(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/auth/login?next=/ads/create');
  }

  const rawFormData = {
    ...Object.fromEntries(formData.entries()),
    images: formData.getAll('images'),
  };

  const validatedFields = adSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0] || Object.values(validatedFields.error.flatten().formErrors)[0];
    return redirect(`/ads/create?error=${encodeURIComponent(firstError || 'Datos de formulario inválidos.')}`);
  }

  const { images, cover_image_index, ...adData } = validatedFields.data;

  try {
    // 1. Create the ad record to get an ID
    const slug = adData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const adSlug = `${slug}-${Date.now().toString().slice(-6)}`;

    const { data: newAd, error: insertError } = await supabase.from('ads').insert({
      user_id: user.id,
      title: adData.title,
      description: adData.description,
      category_id: adData.category_id,
      country_id: adData.country_id,
      region_id: adData.region_id,
      subregion_id: adData.subregion_id || null,
      slug: adSlug,
      status: 'active',
    }).select('id').single();

    if (insertError) throw insertError;
    if (!newAd) throw new Error('No se pudo crear el anuncio.');
    
    const adId = newAd.id;

    // 2. Upload all images in parallel
    const uploadPromises = images.map((image, index) => {
      const fileExt = image.name.split('.').pop();
      const filePath = `${user.id}/${adId}/${Date.now()}-${index}.${fileExt}`;
      return supabase.storage.from('ad_media').upload(filePath, image);
    });

    const uploadResults = await Promise.all(uploadPromises);

    const mediaToInsert = [];
    for (let i = 0; i < uploadResults.length; i++) {
        const { error: uploadError } = uploadResults[i];
        if (uploadError) {
            console.error('Image upload error:', uploadError);
            throw new Error(`Error al subir la imagen ${i + 1}. Inténtalo de nuevo.`);
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('ad_media')
            .getPublicUrl(uploadResults[i].data!.path);

        if (!publicUrl) {
            throw new Error(`No se pudo obtener la URL de la imagen ${i + 1}.`);
        }

        mediaToInsert.push({
            ad_id: adId,
            user_id: user.id,
            url: publicUrl,
            type: 'image' as const,
            is_cover: i === cover_image_index,
        });
    }

    // 3. Insert all media records into the ad_media table
    const { error: mediaInsertError } = await supabase.from('ad_media').insert(mediaToInsert);

    if (mediaInsertError) {
        console.error('Media insert error:', mediaInsertError);
        // Attempt to clean up if media insert fails
        await supabase.from('ads').delete().eq('id', adId);
        throw new Error('Error al guardar las imágenes del anuncio.');
    }

  } catch (error: any) {
    console.error('Error creating ad:', error);
    let errorMessage = 'Error al crear el anuncio.';
    if (error.message) {
      errorMessage = error.message;
    }
    return redirect(`/ads/create?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
