'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type AdStatus = 'active' | 'inactive' | 'draft' | 'expired';

export async function toggleAdStatus(adId: number, newStatus: AdStatus) {
  if (newStatus !== 'active' && newStatus !== 'inactive') {
    throw new Error('Estado no válido.');
  }

  const supabase = createSupabaseServerActionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Autenticación requerida.');
  }

  const { error } = await supabase
    .from('ads')
    .update({ status: newStatus })
    .eq('id', adId)
    .eq('user_id', user.id); // Ensure user can only update their own ads

  if (error) {
    console.error('Supabase error toggling ad status:', error);
    throw new Error('No se pudo actualizar el estado del anuncio.');
  }

  revalidatePath('/dashboard');
}
