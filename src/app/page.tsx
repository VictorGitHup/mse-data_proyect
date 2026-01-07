
import AdCard from "@/components/ads/AdCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdForCard } from "@/lib/types";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const { data: ads, error } = await supabase
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
    .limit(20) as { data: AdForCard[], error: any };

  if (error) {
    console.error("Error fetching ads for homepage:", error);
  }

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
          Bienvenido a MiPlataforma
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed mt-2">
          Explora los anuncios publicados en nuestra plataforma.
        </p>
      </header>

      {ads && ads.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} />
          ))}
        </div>
      ) : (
        <div className="text-center p-16 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold">No hay anuncios activos</h2>
          <p className="text-muted-foreground mt-2">
            Vuelve más tarde o crea tu propio anuncio si eres un anunciante.
          </p>
        </div>
      )}
    </main>
  );
}
