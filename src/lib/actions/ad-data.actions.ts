
'use server';

import { createSupabaseServerActionClient } from "@/lib/supabase/server";

export async function getAdsForAdvertiser(query: string, status: string) {
  const supabase = createSupabaseServerActionClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'User not authenticated' };
  }

  let queryBuilder = supabase
    .from('ads')
    .select(`
      id,
      title,
      created_at,
      status,
      slug,
      category:categories(name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (query) {
    queryBuilder = queryBuilder.ilike('title', `%${query}%`);
  }

  if (status && status !== 'all') {
    queryBuilder = queryBuilder.eq('status', status);
  }

  const { data, error } = await queryBuilder;

  return { data, error: error?.message };
}
