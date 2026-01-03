
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";

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
