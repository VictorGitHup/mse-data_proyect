
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AdView from "@/components/ads/AdView";
import { getSimilarAds } from "@/lib/actions/ad-data.actions";

export default async function AdPage({ params }: { params: { slug: string } }) {
  const supabase = await createSupabaseServerClient();

  const { data: ad, error } = await supabase
    .from("ads")
    .select(`
      *,
      profiles!inner (
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

  const similarAds = await getSimilarAds({
    currentAdId: ad.id,
    categoryId: ad.category_id,
    regionId: ad.region_id,
    tags: ad.tags,
  });

  // The 'any' type cast is a temporary workaround because Supabase's generated types
  // for related tables can be complex. We ensure data integrity through the query itself.
  return <AdView ad={ad as any} similarAds={similarAds} />;
}
