
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import type { AdCommentWithProfile } from '@/lib/types';

// =================================================================
// FETCH ACTIONS
// =================================================================

export async function getRatings(adId: number) {
  const supabase = createSupabaseServerActionClient();
  const { data, error, count } = await supabase
    .from('ad_ratings')
    .select('rating', { count: 'exact' })
    .eq('ad_id', adId);

  if (error) {
    console.error('Error fetching ratings:', error);
    return { average: 0, count: 0 };
  }

  if (!data || data.length === 0) {
    return { average: 0, count: 0 };
  }

  const totalRating = data.reduce((sum, item) => sum + item.rating, 0);
  const average = totalRating / data.length;
  
  return { average, count: count ?? 0 };
}


export async function getComments(adId: number) {
  const supabase = createSupabaseServerActionClient();
  const { data, error } = await supabase
    .from('ad_comments')
    .select('*, profiles(username, avatar_url)')
    .eq('ad_id', adId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getAdCommentsForModeration(adId: number) {
  const supabase = createSupabaseServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Authentication required' };
  }

  // Verify the user owns the ad
  const { data: adOwner, error: adOwnerError } = await supabase
    .from('ads')
    .select('user_id')
    .eq('id', adId)
    .eq('user_id', user.id)
    .single();
    
  if (adOwnerError || !adOwner) {
    return { data: null, error: 'Permission denied or ad not found' };
  }

  // Fetch all comments for the ad
  const { data, error } = await supabase
    .from('ad_comments')
    .select('*, profiles(username, avatar_url)')
    .eq('ad_id', adId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// =================================================================
// MUTATION ACTIONS
// =================================================================

export async function addRating(adId: number, rating: number) {
  const supabase = createSupabaseServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debes iniciar sesión para calificar.' };
  }

  const { error } = await supabase
    .from('ad_ratings')
    .upsert({ ad_id: adId, user_id: user.id, rating: rating }, { onConflict: 'ad_id, user_id' });

  if (error) {
    console.error('Rating error:', error);
    if (error.message.includes('violates check constraint')) {
        return { error: 'No puedes calificar tu propio anuncio.' };
    }
    return { error: 'No se pudo guardar tu calificación.' };
  }

  // After successful rating, re-calculate and return the new average
  const { average, count } = await getRatings(adId);

  revalidatePath(`/ad/.*`, 'page');
  return { averageRating: average, ratingCount: count, error: null };
}

export async function addComment(adId: number, comment: string) {
  const supabase = createSupabaseServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debes iniciar sesión para comentar.' };
  }

  const { error } = await supabase
    .from('ad_comments')
    .insert({ ad_id: adId, user_id: user.id, comment: comment, status: 'pending' });

  if (error) {
    console.error('Comment error:', error);
    if (error.message.includes('violates check constraint')) {
        return { error: 'No puedes comentar tu propio anuncio.' };
    }
    return { error: 'No se pudo guardar tu comentario.' };
  }

  // Revalidate the moderation page for the advertiser
  revalidatePath(`/dashboard/ads/${adId}/manage`);
  return { error: null };
}

export async function updateCommentStatus(commentId: number, adId: number, status: 'approved' | 'rejected') {
    const supabase = createSupabaseServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Authentication required' };
    }
    
    // The RLS policy on the ad_comments table already ensures that only the ad owner can update.
    const { error } = await supabase
        .from('ad_comments')
        .update({ status: status })
        .eq('id', commentId);

    if (error) {
        console.error("Error updating comment status:", error);
        return { error: "Failed to update comment status." };
    }

    revalidatePath(`/dashboard/ads/${adId}/manage`);
    revalidatePath(`/ad/.*`, 'page');
    return { error: null };
}
