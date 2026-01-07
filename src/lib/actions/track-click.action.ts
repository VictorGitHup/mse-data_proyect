'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';

export async function trackContactClick(adId: number) {
  if (!adId) {
    return;
  }
  
  const supabase = createSupabaseServerActionClient();
  
  // Call the RPC function to increment the click count.
  // This is a "fire-and-forget" action, so we don't need to await it
  // or handle its response on the client-side.
  supabase.rpc('increment_ad_contact_click', { ad_id_to_inc: adId }).then(({ error }) => {
    if (error) {
      console.error(`Error tracking click for ad ${adId}:`, error);
    }
  });
}
