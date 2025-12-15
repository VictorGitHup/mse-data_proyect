
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Definimos un tipo para los anuncios para tener autocompletado y seguridad de tipos.
type Ad = {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
};

export default function Home() {
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAds = async () => {
      // Obtenemos los anuncios de la tabla 'ads', ordenados por fecha de creación.
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError(`Error al cargar los anuncios: ${error.message}`);
        console.error('Error fetching ads:', error);
      } else {
        setAds(data);
      }
      setLoading(false);
    };

    fetchAds();
  }, []);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
          Anuncios Recientes
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed mt-2">
          Explora los últimos anuncios publicados en la plataforma.
        </p>
      </header>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Muestra esqueletos de carga para una mejor experiencia de usuario */}
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="text-center">
          <p className="text-destructive font-semibold">¡Ocurrió un error!</p>
          <p className="text-muted-foreground mt-2">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Asegúrate de haber ejecutado el script SQL y que las políticas RLS permitan la lectura (SELECT).
          </p>
        </div>
      )}

      {!loading && !error && ads && ads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => (
            <Card key={ad.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{ad.title}</CardTitle>
                <CardDescription>
                  Publicado el {new Date(ad.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">
                  {ad.description || 'Este anuncio no tiene descripción.'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && (!ads || ads.length === 0) && (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-2xl font-semibold">No hay anuncios todavía</h2>
          <p className="text-muted-foreground mt-2">
            Parece que nadie ha publicado un anuncio. ¡Sé el primero!
          </p>
        </div>
      )}
    </main>
  );
}
