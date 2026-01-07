
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import UserProfileView from "@/components/profile/UserProfileView";
import type { AdForCard } from "@/lib/types";

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = await createSupabaseServerClient();
  const { username } = params;

  // 1. Fetch the profile by username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
        id,
        username,
        full_name,
        avatar_url,
        role,
        contact_email,
        contact_whatsapp,
        contact_telegram,
        contact_social_url,
        country:country_id ( name, phone_code )
    `)
    .eq('username', username)
    .single();
    
  if (profileError || !profile) {
    console.error("Error fetching profile by username:", profileError);
    notFound();
  }

  // 2. Fetch all active ads for this user
  const { data: ads, error: adsError } = await supabase
    .from("ads_with_ratings")
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
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq("ad_media.is_cover", true)
    .order("boosted_until", { ascending: false, nulls: "last" })
    .order("created_at", { ascending: false });

  if (adsError) {
    console.error("Error fetching ads for profile page:", adsError);
    // Continue even if ads fail to load, just show the profile info
  }
  
  // The 'any' cast is a workaround for complex generated types.
  return <UserProfileView profile={profile as any} ads={ads as AdForCard[] || []} />;
}
