
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdForTable } from "../types";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseISO } from 'date-fns';

export async function getAdsForAdvertiser(query: string, status: string) {
  const supabase = await createSupabaseServerClient();

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
      boosted_until,
      view_count,
      contact_click_count,
      category:categories(name),
      comments_count:ad_comments(count)
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

  // Supabase returns the count as an array with an object, e.g., [{ count: 5 }]
  // We need to flatten this. We are no longer formatting the date here.
  const adsWithFlattenedComments = data?.map(ad => ({
    ...ad,
    comments_count: (ad.comments_count as unknown as [{ count: number }])[0].count,
  }));

  return { data: adsWithFlattenedComments, error: error?.message };
}

export async function getSimilarAds({
  currentAdId,
  categoryId,
  regionId,
  tags,
}: {
  currentAdId: number;
  categoryId: number;
  regionId: number | null;
  tags: string[] | null;
}): Promise<AdForCard[]> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  // Base query
  let query = supabase
    .from("ads_with_ratings") // Use the new view
    .select(`
      id,
      title,
      slug,
      tags,
      avg_rating,
      rating_count,
      boosted_until,
      ad_media!inner(url, is_cover),
      category:categories(name),
      country:country_id(name)
    `)
    .eq("status", "active")
    .eq("ad_media.is_cover", true)
    .neq('id', currentAdId) // Exclude the current ad
    .order("boosted_until", { ascending: false, nulls: "last" })
    .order("created_at", { ascending: false })
    .limit(4);

  const filters = [];
  // Prioritize ads in the same category
  filters.push(`category_id.eq.${categoryId}`);

  // Add region and tags for more specific matching
  if (regionId) {
    filters.push(`region_id.eq.${regionId}`);
  }
  if (tags && tags.length > 0) {
    // Search for ads that have at least one common tag
    filters.push(`tags.cs.{${tags.join(',')}}`);
  }

  // Combine filters with OR logic to broaden the search if needed
  query = query.or(filters.join(','));

  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching similar ads:", error);
    return [];
  }

  // If not enough results, fall back to just category
  if (data.length < 4) {
    const fallbackQuery = supabase
      .from("ads_with_ratings") // Use the new view
      .select(`
        id,
        title,
        slug,
        tags,
        avg_rating,
        rating_count,
        boosted_until,
        ad_media!inner(url, is_cover),
        category:categories(name),
        country:country_id(name)
      `)
      .eq("status", "active")
      .eq("ad_media.is_cover", true)
      .eq('category_id', categoryId)
      .neq('id', currentAdId)
      .order("boosted_until", { ascending: false, nulls: "last" })
      .order("created_at", { ascending: false })
      .limit(4);
    
    const { data: fallbackData, error: fallbackError } = await fallbackQuery;

    if (fallbackError) {
      console.error("Error fetching fallback similar ads:", fallbackError);
      return data as AdForCard[]; // Return what we have
    }
    
    // Combine and remove duplicates
    const combined = [...data, ...fallbackData];
    const unique = Array.from(new Map(combined.map(ad => [ad.id, ad])).values());
    return unique.slice(0, 4) as AdForCard[];
  }

  return data as AdForCard[];
}
