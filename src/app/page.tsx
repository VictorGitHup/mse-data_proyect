
import AdCard from "@/components/ads/AdCard";
import AdFilters from "@/components/ads/AdFilters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdForCard, Category, Location } from "@/lib/types";
import { isFuture, parseISO } from 'date-fns';
import { Rocket } from "lucide-react";

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: {
    q?: string;
    category?: string;
    country?: string;
    region?: string;
    subregion?: string;
  };
}

export default async function Home({ searchParams }: HomePageProps) {
  const supabase = await createSupabaseServerClient();

  // Fetch initial data for filters
  const { data: categories } = await supabase.from('categories').select('id, name').order('name');
  const { data: countries } = await supabase.from('locations').select('id, name').eq('type', 'country').order('name');

  // --- Smart Search Logic ---
  let queryText = searchParams.q || '';
  const searchTerms = queryText.toLowerCase().split(' ').filter(term => term.length > 1);
  let locationFilters: { country?: string, region?: string, subregion?: string } = {
    country: searchParams.country,
    region: searchParams.region,
    subregion: searchParams.subregion,
  };
  const generalSearchTerms: string[] = [];

  if (queryText) {
    const { data: matchedLocations } = await supabase
      .from('locations')
      .select('id, name, type, parent_id')
      .in('name', searchTerms.map(term => term.charAt(0).toUpperCase() + term.slice(1))); // Capitalize for matching

    const foundLocationNames: string[] = [];

    // Prioritize subregion, then region, then country
    const subregionMatch = matchedLocations?.find(l => l.type === 'subregion');
    const regionMatch = matchedLocations?.find(l => l.type === 'region');
    const countryMatch = matchedLocations?.find(l => l.type === 'country');

    if (subregionMatch) {
      locationFilters.subregion = String(subregionMatch.id);
      foundLocationNames.push(subregionMatch.name.toLowerCase());
    }
    if (regionMatch) {
      locationFilters.region = String(regionMatch.id);
      foundLocationNames.push(regionMatch.name.toLowerCase());
    }
    if (countryMatch) {
      locationFilters.country = String(countryMatch.id);
      foundLocationNames.push(countryMatch.name.toLowerCase());
    }
    
    // Terms that are not locations are general search terms
    searchTerms.forEach(term => {
      if (!foundLocationNames.includes(term)) {
        generalSearchTerms.push(term);
      }
    });
  }

  // --- Ad Query Construction ---
  let query = supabase
    .from("ads_with_ratings") // Use the new view here
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
    .order("boosted_until", { ascending: false, nulls: "last" })
    .order("created_at", { ascending: false })
    .limit(40); // Increased limit to fetch more ads for both sections

  if (generalSearchTerms.length > 0) {
    const titleQuery = generalSearchTerms.map(term => `'${term}'`).join(' & ');
    const tagsQuery = `{${generalSearchTerms.map(term => `"${term}"`).join(',')}}`;
    query = query.or(`title.fts.${titleQuery},tags.cs.${tagsQuery}`);
  }

  // Apply filters from URL search params OR smart search
  if (searchParams.category) {
    query = query.eq('category_id', searchParams.category);
  }
  if (locationFilters.country) {
    query = query.eq('country_id', locationFilters.country);
  }
  if (locationFilters.region) {
    query = query.eq('region_id', locationFilters.region);
  }
  if (locationFilters.subregion) {
    query = query.eq('subregion_id', locationFilters.subregion);
  }

  const { data: ads, error } = await query as { data: AdForCard[], error: any };

  if (error) {
    console.error("Error fetching ads for homepage:", error);
  }

  // Separate boosted from regular ads
  const now = new Date();
  const allAds = ads || [];
  const boostedAds = allAds.filter(ad => ad.boosted_until && isFuture(parseISO(ad.boosted_until)));
  const regularAds = allAds.filter(ad => !boostedAds.some(boostedAd => boostedAd.id === ad.id));


  // We pass the potentially modified filters to the AdFilters component
  // so the dropdowns reflect the smart search.
  const initialFilterState = {
    ...searchParams,
    ...locationFilters,
    q: generalSearchTerms.join(' '), // Show only non-location terms in search bar
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <AdFilters
        initialCategories={categories as Category[]}
        initialCountries={countries as Location[]}
        initialFilterState={initialFilterState}
      />

      {boostedAds.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
            <Rocket className="text-yellow-500"/>
            Anuncios Destacados
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
            {boostedAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        </section>
      )}

      {regularAds.length > 0 ? (
        <section>
           {boostedAds.length > 0 && (
             <h2 className="text-2xl font-bold tracking-tight mb-6">Más anuncios</h2>
           )}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {regularAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        </section>
      ) : boostedAds.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed rounded-lg mt-8">
          <h2 className="text-2xl font-semibold">No se encontraron anuncios</h2>
          <p className="text-muted-foreground mt-2">
            Prueba a cambiar los filtros o vuelve más tarde.
          </p>
        </div>
      ) : null}
    </main>
  );
}
