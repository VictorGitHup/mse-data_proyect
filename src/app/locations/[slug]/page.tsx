
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AdCard from "@/components/ads/AdCard";
import AdFilters from "@/components/ads/AdFilters";
import type { AdForCard, Category, Location } from "@/lib/types";

export const dynamic = 'force-dynamic';

interface LocationPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    q?: string;
    category?: string;
  };
}

export default async function LocationPage({ params, searchParams }: LocationPageProps) {
  const supabase = await createSupabaseServerClient();
  const { slug } = params;

  // 1. Find the location by slug
  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('id, name, type, parent_id')
    .eq('slug', slug)
    .single();

  if (locationError || !location) {
    notFound();
  }

  // 2. Fetch data for filters
  const { data: categories } = await supabase.from('categories').select('id, name').order('name');
  const { data: countries } = await supabase.from('locations').select('id, name').eq('type', 'country').order('name');

  // 3. Construct the ad query
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
    .order("boosted_until", { ascending: false, nulls: "last" })
    .order("created_at", { ascending: false })
    .limit(20);

  // Apply location filter based on its type
  switch (location.type) {
    case 'country':
      query = query.eq('country_id', location.id);
      break;
    case 'region':
      query = query.eq('region_id', location.id);
      break;
    case 'subregion':
      query = query.eq('subregion_id', location.id);
      break;
  }
  
  // Apply other search params
  if (searchParams.q) {
    const titleQuery = `'${searchParams.q}'`;
    const tagsQuery = `{${searchParams.q.split(' ').map(t => `"${t}"`).join(',')}}`;
    query = query.or(`title.fts.${titleQuery},tags.cs.${tagsQuery}`);
  }
  if (searchParams.category) {
    query = query.eq('category_id', searchParams.category);
  }

  const { data: ads, error: adsError } = await query as { data: AdForCard[], error: any };

  if (adsError) {
    console.error("Error fetching ads for location page:", adsError);
  }

  // Set initial state for filters based on the location
  const initialFilterState: { [key: string]: string } = { ...searchParams };
  if (location.type === 'country') initialFilterState.country = String(location.id);
  if (location.type === 'region') initialFilterState.region = String(location.id);
  if (location.type === 'subregion') initialFilterState.subregion = String(location.id);


  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
          Anuncios en {location.name}
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed mt-2">
          Explora los anuncios disponibles en esta área.
        </p>
      </header>

      <AdFilters
        initialCategories={categories as Category[]}
        initialCountries={countries as Location[]}
        initialFilterState={initialFilterState}
      />

      {ads && ads.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6 mt-8">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      ) : (
        <div className="text-center p-16 border-2 border-dashed rounded-lg mt-8">
          <h2 className="text-2xl font-semibold">No se encontraron anuncios</h2>
          <p className="text-muted-foreground mt-2">
            No hay anuncios disponibles para esta ubicación y filtros. ¡Sé el primero en publicar!
          </p>
        </div>
      )}
    </main>
  );
}
