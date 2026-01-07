
import AdCard from "@/components/ads/AdCard";
import AdFilters from "@/components/ads/AdFilters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdForCard, Category, Location } from "@/lib/types";

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

  // Build query for ads based on search params
  let query = supabase
    .from("ads")
    .select(`
      id,
      title,
      slug,
      ad_media!inner(url, is_cover),
      category:categories(name),
      country:country_id(name)
    `)
    .eq("status", "active")
    .eq("ad_media.is_cover", true)
    .order("boosted_until", { ascending: false, nulls: "last" })
    .order("created_at", { ascending: false })
    .limit(20);

  if (searchParams.q) {
    query = query.ilike('title', `%${searchParams.q}%`);
  }
  if (searchParams.category) {
    query = query.eq('category_id', searchParams.category);
  }
  if (searchParams.country) {
    query = query.eq('country_id', searchParams.country);
  }
  if (searchParams.region) {
    query = query.eq('region_id', searchParams.region);
  }
  if (searchParams.subregion) {
    query = query.eq('subregion_id', searchParams.subregion);
  }

  const { data: ads, error } = await query as { data: AdForCard[], error: any };

  if (error) {
    console.error("Error fetching ads for homepage:", error);
  }

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
          Bienvenido a MiPlataforma
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed mt-2">
          Explora los anuncios publicados en nuestra plataforma.
        </p>
      </header>

      <AdFilters
        initialCategories={categories as Category[]}
        initialCountries={countries as Location[]}
      />

      {ads && ads.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      ) : (
        <div className="text-center p-16 border-2 border-dashed rounded-lg mt-8">
          <h2 className="text-2xl font-semibold">No se encontraron anuncios</h2>
          <p className="text-muted-foreground mt-2">
            Prueba a cambiar los filtros o vuelve más tarde.
          </p>
        </div>
      )}
    </main>
  );
}
