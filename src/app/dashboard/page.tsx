
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type Ad = {
  id: number;
  title: string;
  created_at: string;
  active: boolean;
};

async function AdvertiserAds({ userId }: { userId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data: ads, error } = await supabase
    .from('ads')
    .select('id, title, created_at, active')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('No se pudieron cargar tus anuncios. Por favor, inténtalo de nuevo.');
  }

  if (ads.length === 0) {
    return (
      <div className="border-2 border-dashed rounded-lg p-16 text-center">
        <h2 className="text-2xl font-semibold">Tus Anuncios</h2>
        <p className="text-muted-foreground mt-2">
          Aquí aparecerán los anuncios que has creado. ¡Empieza creando uno nuevo!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {(ads as Ad[]).map((ad) => (
        <Card key={ad.id}>
          <CardHeader>
            <CardTitle className="truncate">{ad.title}</CardTitle>
            <CardDescription>
              Creado el {format(new Date(ad.created_at), 'dd/MM/yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <Badge variant={ad.active ? 'secondary' : 'destructive'}>
                {ad.active ? 'Activo' : 'Inactivo'}
              </Badge>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/ads/${ad.id}/manage`}>Gestionar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'ADVERTISER') {
    return (
        <div className="container mx-auto flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center p-4">
            <h1 className="text-3xl font-bold mb-4">Acceso Denegado</h1>
            <p className="text-lg text-muted-foreground mb-8">Esta página es solo para anunciantes. Si eres un anunciante, por favor actualiza tu rol en tu perfil.</p>
            <Link href="/account">
                <Button>Ir a mi Perfil</Button>
            </Link>
        </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-12">
            <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
                Panel de Anunciante
            </h1>
            <Link href="/ads/create">
                <Button>Crear Nuevo Anuncio</Button>
            </Link>
        </header>
        
        <AdvertiserAds userId={user.id} />

    </div>
  );
}
