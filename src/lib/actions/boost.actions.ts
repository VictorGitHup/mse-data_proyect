'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { add } from 'date-fns';

export async function boostAd(adId: number) {
  const supabase = createSupabaseServerActionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Autenticación requerida.' };
  }

  // Calculate the new boost expiration date (7 days from now)
  const boostedUntil = add(new Date(), { days: 7 });

  const { error } = await supabase
    .from('ads')
    .update({ boosted_until: boostedUntil.toISOString() })
    .eq('id', adId)
    .eq('user_id', user.id); // Ensure user can only boost their own ads

  if (error) {
    console.error('Supabase error boosting ad:', error);
    return { error: 'No se pudo destacar el anuncio.' };
  }
  
  revalidatePath('/dashboard');
  revalidatePath('/');
  revalidatePath('/locations/.*', 'page');
  return { error: null };
}
