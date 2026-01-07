
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAdvertiserMedia() {
  const supabase = createSupabaseServerActionClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'User not authenticated' };
  }

  const { data, error } = await supabase
    .from('ad_media')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function deleteMedia(mediaId: number) {
  const supabase = createSupabaseServerActionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Autenticación requerida.' };
  }

  // First, get the media item to ensure it belongs to the user and to get its URL
  const { data: mediaItem, error: fetchError } = await supabase
    .from('ad_media')
    .select('id, url, user_id')
    .eq('id', mediaId)
    .single();

  if (fetchError || !mediaItem) {
    return { error: 'No se encontró el archivo multimedia.' };
  }

  if (mediaItem.user_id !== user.id) {
    return { error: 'No tienes permiso para eliminar este archivo.' };
  }

  // Delete the record from the ad_media table
  const { error: dbError } = await supabase
    .from('ad_media')
    .delete()
    .eq('id', mediaId);

  if (dbError) {
    console.error("DB deletion error:", dbError);
    return { error: 'Error al eliminar el registro de la base de datos.' };
  }

  // Extract the path from the URL to delete from storage
  const filePath = mediaItem.url.split('/ad_media/').pop();

  if (!filePath) {
    return { error: 'No se pudo determinar la ruta del archivo para eliminarlo del almacenamiento.' };
  }

  // Delete the file from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('ad_media')
    .remove([filePath]);

  if (storageError) {
    console.error("Storage deletion error:", storageError);
    // Note: At this point, the DB record is gone. We might want to add logic to handle this inconsistency.
    // For now, we'll just report the error.
    return { error: 'Error al eliminar el archivo del almacenamiento.' };
  }
  
  revalidatePath('/dashboard');
  revalidatePath('/ads/create');
  // We can't know which ad pages to revalidate, but this is a start.
  // A more robust solution might involve a queue or revalidating on next visit.

  return { error: null };
}
