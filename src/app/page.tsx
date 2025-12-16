
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Ad = {
  id: number;
  title: string;
  description: string;
  location_city: string;
  location_country: string;
  created_at: string;
};

export default async function Home() {
  const supabase = createSupabaseServerClient();
  const { data: ads, error } = await supabase
    .from('ads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ads:', error);
    // You could return an error message component here
  }

  const loading = !ads;

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
          Anuncios Recientes
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed mt-2">
          Explora los últimos anuncios publicados en nuestra plataforma.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="overflow-hidden flex flex-col">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <div className="p-4 pt-0">
                <Skeleton className="h-6 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : ads && ads.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ads.map((ad) => (
            <Card key={ad.id} className="overflow-hidden flex flex-col">
              <div className="relative w-full h-48">
                 <Image
                  src={`https://picsum.photos/seed/${ad.id}/400/300`}
                  alt={ad.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint="portrait woman"
                />
              </div>
              <CardHeader>
                <CardTitle className="truncate">{ad.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {ad.location_city}, {ad.location_country}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {ad.description || 'Sin descripción.'}
                </p>
              </CardContent>
              <div className="p-4 pt-0">
                  <Badge variant="secondary">Ver más</Badge>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold">No hay anuncios todavía</h2>
          <p className="text-muted-foreground mt-2">
            ¡Sé el primero! Una vez que se creen anuncios, aparecerán aquí.
          </p>
        </div>
      )}
    </main>
  );
}
