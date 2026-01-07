
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_MEDIA_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/mov"];

const fileSchema = z.instanceof(File).refine(file => file.size > 0, "El archivo no puede estar vacío.");

// Define the array schema with all its validations first.
const mediaSchema = z.array(fileSchema)
  .min(1, 'Debes subir al menos una imagen o video.')
  .max(5, 'Puedes subir un máximo de 5 archivos.')
  .refine(files => files.every(file => file.size <= MAX_FILE_SIZE), `Cada archivo debe pesar menos de 50MB.`)
  .refine(files => files.every(file => ACCEPTED_MEDIA_TYPES.includes(file.type)), "Solo se aceptan formatos de imagen (JPG, PNG, WEBP) y video (MP4, MOV).")
  .refine(files => {
    const videoCount = files.filter(file => file.type.startsWith('video/')).length;
    return videoCount <= 1;
  }, 'Solo puedes subir un video por anuncio.');


const adSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  category_id: z.coerce.number().int().positive('Debes seleccionar una categoría.'),
  country_id: z.coerce.number().int().positive('Debes seleccionar un país.'),
  region_id: z.coerce.number().int().positive('Debes seleccionar una región.'),
  subregion_id: z.coerce.number().int().optional(),
  tags: z.string().transform(val => val ? JSON.parse(val) : []).pipe(z.string().array().optional()),
  // Now, use preprocess with the fully defined mediaSchema.
  media: z.preprocess((arg) => {
    if (arg === undefined || arg === null) return [];
    return Array.isArray(arg) ? arg : [arg];
  }, mediaSchema),
  cover_image_index: z.coerce.number().int().min(0).max(4),
});

export async function createAd(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/auth/login?next=/ads/create');
  }
  
  const rawFormData = {
    title: formData.get('title'),
    description: formData.get('description'),
    category_id: formData.get('category_id'),
    country_id: formData.get('country_id'),
    region_id: formData.get('region_id'),
    subregion_id: formData.get('subregion_id'),
    tags: formData.get('tags'),
    media: formData.getAll('media'),
    cover_image_index: formData.get('cover_image_index'),
  };
  
  const validatedFields = adSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
    const formErrors = validatedFields.error.flatten().formErrors;
    const fieldErrors = Object.values(validatedFields.error.flatten().fieldErrors);
    const firstError = formErrors[0] || fieldErrors[0]?.[0];
    return redirect(`/ads/create?error=${encodeURIComponent(firstError || 'Datos de formulario inválidos.')}`);
  }

  const { media, cover_image_index, ...adData } = validatedFields.data;

  try {
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
      tags: adData.tags || [],
      slug: adSlug,
      status: 'active',
    }).select('id').single();

    if (insertError) throw insertError;
    if (!newAd) throw new Error('No se pudo crear el anuncio.');
    
    const adId = newAd.id;

    const uploadPromises = media.map((file) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${adId}/${Date.now()}-${Math.random()}.${fileExt}`;
      return supabase.storage.from('ad_media').upload(filePath, file);
    });

    const uploadResults = await Promise.all(uploadPromises);

    const mediaToInsert = [];
    for (let i = 0; i < uploadResults.length; i++) {
        const { error: uploadError, data: uploadData } = uploadResults[i];
        if (uploadError) {
            console.error('Media upload error:', uploadError);
            throw new Error(`Error al subir el archivo ${i + 1}. Inténtalo de nuevo.`);
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('ad_media')
            .getPublicUrl(uploadData.path);

        if (!publicUrl) {
            throw new Error(`No se pudo obtener la URL del archivo ${i + 1}.`);
        }

        const file = media[i];
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        const isCover = mediaType === 'image' && i === cover_image_index;

        mediaToInsert.push({
            ad_id: adId,
            user_id: user.id,
            url: publicUrl,
            type: mediaType,
            is_cover: isCover,
        });
    }

    const { error: mediaInsertError } = await supabase.from('ad_media').insert(mediaToInsert);

    if (mediaInsertError) {
        console.error('Media insert error:', mediaInsertError);
        await supabase.from('ads').delete().eq('id', adId);
        const pathsToDelete = uploadResults.map(res => res.data?.path).filter(Boolean) as string[];
        if (pathsToDelete.length > 0) {
          await supabase.storage.from('ad_media').remove(pathsToDelete);
        }
        throw new Error('Error al guardar los archivos del anuncio.');
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
  revalidatePath('/');
  redirect('/dashboard');
}
