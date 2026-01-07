
'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const fileSchema = z.instanceof(File).optional();

const adUpdateSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  category_id: z.coerce.number().int().positive('Debes seleccionar una categoría.'),
  country_id: z.coerce.number().int().positive('Debes seleccionar un país.'),
  region_id: z.coerce.number().int().positive('Debes seleccionar una región.'),
  subregion_id: z.coerce.number().int().optional(),
  tags: z.string().transform(val => val ? JSON.parse(val) : []).pipe(z.string().array().optional()),
  new_media: z.preprocess((arg) => (Array.isArray(arg) ? arg : [arg].filter(Boolean)), z.array(fileSchema).optional()),
  media_to_delete: z.string().transform(val => JSON.parse(val)),
  cover_image: z.string().transform(val => JSON.parse(val)).nullable(),
});

export async function updateAd(adId: number, formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  const errorRedirectUrl = `/dashboard/ads/${adId}/manage`;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/auth/login?next=${errorRedirectUrl}`);
  
  const rawFormData = {
    ...Object.fromEntries(formData.entries()),
    new_media: formData.getAll('new_media').filter(f => (f as File).size > 0),
  };

  const validatedFields = adUpdateSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    console.error('Validation errors:', validatedFields.error.flatten().fieldErrors);
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0] || 'Datos de formulario inválidos.';
    return redirect(`${errorRedirectUrl}?error=${encodeURIComponent(firstError)}`);
  }

  const { title, description, category_id, country_id, region_id, subregion_id, tags, new_media, media_to_delete, cover_image } = validatedFields.data;

  try {
    // 1. Delete media marked for deletion
    if (media_to_delete && media_to_delete.length > 0) {
      const { data: mediaUrls, error: selectError } = await supabase
        .from('ad_media')
        .select('url')
        .in('id', media_to_delete)
        .eq('user_id', user.id);

      if (selectError) throw new Error("Error al buscar medios para eliminar.");
      
      const { error: deleteDbError } = await supabase.from('ad_media').delete().in('id', media_to_delete);
      if (deleteDbError) throw new Error("Error al eliminar medios de la base de datos.");

      if (mediaUrls.length > 0) {
        const pathsToDelete = mediaUrls.map(item => item.url.split('/ad_media/').pop()).filter(Boolean) as string[];
        await supabase.storage.from('ad_media').remove(pathsToDelete);
      }
    }

    // 2. Upload new media
    let uploadedMedia: { url: string; type: 'image' | 'video'; filePreview: string }[] = [];
    if (new_media && new_media.length > 0) {
        const uploadPromises = new_media.map(file => {
          if (!file) return Promise.resolve(null);
          const fileExt = file.name.split('.').pop();
          const filePath = `${user.id}/${adId}/${Date.now()}-${Math.random()}.${fileExt}`;
          const originalPreview = file instanceof File ? URL.createObjectURL(file) : '';
          return supabase.storage.from('ad_media').upload(filePath, file).then(res => ({ ...res, originalPreview }));
        });

        const uploadResults = await Promise.all(uploadPromises);
        
        for (const result of uploadResults) {
            if (!result || result.error) throw new Error('Error al subir nuevos archivos.');
            const { data: { publicUrl } } = supabase.storage.from('ad_media').getPublicUrl(result.data.path);
            const file = new_media.find(f => f && f instanceof File && URL.createObjectURL(f) === result.originalPreview);
            uploadedMedia.push({ url: publicUrl, type: file?.type.startsWith('video') ? 'video' : 'image', filePreview: result.originalPreview });
        }
    }
    
    // 3. Update ad info
    const { error: updateError } = await supabase.from('ads').update({
        title, description, category_id, country_id, region_id, subregion_id: subregion_id || null, tags: tags || [], updated_at: new Date().toISOString()
    }).eq('id', adId).eq('user_id', user.id);
    if (updateError) throw updateError;
    
    // 4. Insert new media records
    if (uploadedMedia.length > 0) {
        const newMediaToInsert = uploadedMedia.map(media => ({
            ad_id: adId,
            user_id: user.id,
            url: media.url,
            type: media.type,
            is_cover: cover_image?.type === 'new' && cover_image.value === media.filePreview && media.type === 'image'
        }));
        const { error: mediaInsertError } = await supabase.from('ad_media').insert(newMediaToInsert);
        if (mediaInsertError) throw new Error("Error al guardar nuevos medios.");
    }
    
    // 5. Update cover image status
    // First, set all media for this ad to be not the cover.
    await supabase.from('ad_media').update({ is_cover: false }).eq('ad_id', adId);
    
    if (cover_image) {
        if (cover_image.type === 'existing') {
            await supabase.from('ad_media').update({ is_cover: true }).eq('id', cover_image.value);
        } else { // type 'new'
            const newCoverMedia = uploadedMedia.find(m => m.filePreview === cover_image.value);
            if (newCoverMedia) {
                await supabase.from('ad_media').update({ is_cover: true }).eq('url', newCoverMedia.url);
            }
        }
    } else {
        // If no cover is explicitly set (e.g., previous cover was deleted), set the first available image as cover.
        const { data: allAdMedia, error: mediaError } = await supabase.from('ad_media').select('id, type').eq('ad_id', adId).order('created_at');
        if (mediaError) throw new Error("Could not fetch media to set default cover.");
        
        const firstImage = allAdMedia.find(m => m.type === 'image');
        if (firstImage) {
            await supabase.from('ad_media').update({ is_cover: true }).eq('id', firstImage.id);
        }
    }


  } catch (error: any) {
    console.error('Error updating ad:', error);
    return redirect(`${errorRedirectUrl}?error=${encodeURIComponent(error.message)}`);
  }

  // Fetch the ad slug before revalidating the public path
  const { data: ad, error: slugError } = await supabase
    .from('ads')
    .select('slug')
    .eq('id', adId)
    .single();

  if (slugError || !ad) {
    console.error('Could not fetch ad slug for revalidation:', slugError);
    // Redirect to dashboard even if revalidation fails for the public page
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/ads/${adId}/manage`);
    return redirect('/dashboard');
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/ads/${adId}/manage`);
  revalidatePath(`/ad/${ad.slug}`);
  revalidatePath('/');
  redirect('/dashboard');
}
