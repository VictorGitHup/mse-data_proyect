
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Suspense } from 'react';
import AdvertiserDashboard from './AdvertiserDashboard';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardSkeleton() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <div className="flex justify-between items-center">
                 <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-10" />
                    <Skeleton className="h-5 w-16" />
                 </div>
                 <Skeleton className="h-9 w-24" />
              </div>
            </div>
        ))}
      </div>
    )
}

async function DashboardData() {
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

  const { data: ads, error } = await supabase
    .from('ads')
    .select('id, title, created_at, active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch ads:', error);
    // You might want to show a proper error UI here
    return <div>Error al cargar los anuncios.</div>;
  }

  return <AdvertiserDashboard initialAds={ads} />;
}


export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-12">
            <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
                Panel de Anunciante
            </h1>
            {/* This button should ideally only show for advertisers, checked inside DashboardData */}
            <Link href="/ads/create">
                <Button>Crear Nuevo Anuncio</Button>
            </Link>
        </header>
        
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardData />
        </Suspense>
    </div>
  );
}
