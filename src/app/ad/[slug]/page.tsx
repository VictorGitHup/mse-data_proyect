
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AdView from "@/components/ads/AdView";
import { getSimilarAds } from "@/lib/actions/ad-data.actions";
import { getRatings, getComments, getUserRating } from "@/lib/actions/ratings-comments.actions";
import type { AdCommentWithProfile } from "@/lib/types";

export default async function AdPage({ params }: { params: { slug: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ad, error } = await supabase
    .from("ads")
    .select(`
      *,
      profiles!inner (
        id,
        username,
        avatar_url,
        contact_email,
        contact_whatsapp,
        contact_telegram,
        contact_social_url,
        country:country_id ( name, phone_code )
      ),
      categories (name),
      country:country_id (name),
      region:region_id (name),
      subregion:subregion_id (name),
      ad_media (
        id,
        url,
        is_cover,
        type
      )
    `)
    .eq("slug", params.slug)
    .single();

  if (error || !ad) {
    console.error("Error fetching ad by slug:", error);
    notFound();
  }

  // Increment view count via RPC
  await supabase.rpc('increment_ad_view', { ad_id_to_inc: ad.id });

  // Fetch related data in parallel
  const [similarAds, ratingData, commentsData, userRatingData] = await Promise.all([
    getSimilarAds({
      currentAdId: ad.id,
      categoryId: ad.category_id,
      regionId: ad.region_id,
      tags: ad.tags,
    }),
    getRatings(ad.id),
    getComments(ad.id),
    user ? getUserRating(ad.id, user.id) : Promise.resolve({ data: null })
  ]);
  
  const { average: averageRating, count: ratingCount } = ratingData;
  const initialComments = commentsData.data as AdCommentWithProfile[] || [];
  const initialUserRating = userRatingData.data?.rating || 0;

  // The 'any' type cast is a temporary workaround because Supabase's generated types
  // for related tables can be complex. We ensure data integrity through the query itself.
  return (
      <AdView 
        ad={ad as any} 
        similarAds={similarAds}
        initialAverageRating={averageRating}
        initialRatingCount={ratingCount}
        initialComments={initialComments}
        currentUser={user}
        initialUserRating={initialUserRating}
      />
  );
}
