
import { getTopRatedAdsByCategory } from "@/lib/actions/ad-data.actions";
import RankingCard from "@/components/ads/RankingCard";
import type { Category, Location } from "@/lib/types";
import { Award, Trophy } from "lucide-react";
import AdFilters from "@/components/ads/AdFilters";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

interface RankingPageProps {
  searchParams: {
    q?: string;
    category?: string;
    country?: string;
    region?: string;
    subregion?: string;
  };
}

export default async function RankingPage({ searchParams }: RankingPageProps) {
  const supabase = await createSupabaseServerClient();
  
  // Fetch data for filters
  const { data: initialCategories } = await supabase.from('categories').select('id, name').order('name');
  const { data: initialCountries } = await supabase.from('locations').select('id, name').eq('type', 'country').order('name');
  
  const filters = {
    q: searchParams.q,
    categoryId: searchParams.category,
    countryId: searchParams.country,
    regionId: searchParams.region,
    subregionId: searchParams.subregion,
  };

  const { data: categoriesWithAds, error } = await getTopRatedAdsByCategory(filters);

  if (error) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold">Error al cargar el ranking</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const getPodiumColor = (index: number) => {
    if (index === 0) return 'text-yellow-400';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-orange-400';
    return 'text-muted-foreground';
  };
  
  const hasResults = categoriesWithAds?.some(c => c.top_ads.length > 0);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl flex items-center justify-center gap-4">
          <Trophy className="h-10 w-10 text-yellow-500"/>
          Ranking de Anuncios
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed mt-2">
          Descubre los anuncios mejor calificados por la comunidad. Usa los filtros para refinar tu búsqueda.
        </p>
      </header>

      <AdFilters
        initialCategories={initialCategories as Category[]}
        initialCountries={initialCountries as Location[]}
        initialFilterState={searchParams}
      />
      
      <div className="space-y-16 mt-8">
        {hasResults ? (
          (categoriesWithAds as (Category & { top_ads: any[] })[])?.map(category => (
            category.top_ads.length > 0 && (
              <section key={category.id}>
                <h2 className="text-3xl font-bold tracking-tight mb-8 border-b pb-4 flex items-center gap-3">
                   <Award className="h-8 w-8 text-primary"/>
                   Top {category.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {category.top_ads.map((ad, index) => (
                    <RankingCard 
                      key={ad.id} 
                      ad={ad} 
                      rank={index + 1} 
                      podiumColor={getPodiumColor(index)}
                    />
                  ))}
                </div>
              </section>
            )
          ))
        ) : (
            <div className="text-center p-16 border-2 border-dashed rounded-lg">
                <h2 className="text-2xl font-semibold">No se encontraron anuncios para el ranking</h2>
                <p className="text-muted-foreground mt-2">
                Prueba a cambiar los filtros o vuelve más tarde.
                </p>
            </div>
        )}
      </div>
    </main>
  );
}
