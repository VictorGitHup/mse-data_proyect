
'use client';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { useEffect, useState, useTransition } from 'react';
import type { User } from '@supabase/supabase-js';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toggleAdStatus } from '@/app/ads/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type Ad = {
  id: number;
  title: string;
  created_at: string;
  active: boolean;
};

function AdvertiserAds({ userId, initialAds, userRole }: { userId: string, initialAds: Ad[], userRole: string | undefined }) {
  const [ads, setAds] = useState<Ad[]>(initialAds);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setAds(initialAds);
  }, [initialAds]);
  
  const handleToggle = (adId: number, currentStatus: boolean) => {
    startTransition(async () => {
      try {
        await toggleAdStatus(adId, currentStatus);
        setAds(prevAds => 
          prevAds.map(ad => 
            ad.id === adId ? { ...ad, active: !currentStatus } : ad
          )
        );
        toast({
          title: 'Estado actualizado',
          description: `El anuncio ha sido ${!currentStatus ? 'activado' : 'desactivado'}.`,
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    });
  };

  if (userRole !== 'ADVERTISER') {
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
      {ads.map((ad) => (
        <Card key={ad.id}>
          <CardHeader>
            <CardTitle className="truncate">{ad.title}</CardTitle>
            <CardDescription>
              Creado el {format(new Date(ad.created_at), 'dd/MM/yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
               <div className="flex items-center space-x-2">
                <Switch
                  id={`status-${ad.id}`}
                  checked={ad.active}
                  onCheckedChange={() => handleToggle(ad.id, ad.active)}
                  disabled={isPending}
                  aria-label="Estado del anuncio"
                />
                <Label htmlFor={`status-${ad.id}`} className={ad.active ? 'text-green-600' : 'text-red-600'}>
                  {ad.active ? 'Activo' : 'Inactivo'}
                </Label>
              </div>
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

function DashboardSkeleton() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                 <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                       <Skeleton className="h-6 w-10" />
                       <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                 </div>
              </CardContent>
            </Card>
        ))}
      </div>
    )
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profileRole, setProfileRole] = useState<string | undefined>(undefined);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = await createSupabaseServerClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        redirect('/login');
        return;
      }
      setUser(authUser);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      setProfileRole(profile?.role);

      if (profile?.role === 'ADVERTISER') {
        const { data: userAds, error } = await supabase
          .from('ads')
          .select('id, title, created_at, active')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch ads:', error);
        } else {
          setAds(userAds as Ad[]);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-12">
            <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
                Panel de Anunciante
            </h1>
            {profileRole === 'ADVERTISER' && (
              <Link href="/ads/create">
                  <Button>Crear Nuevo Anuncio</Button>
              </Link>
            )}
        </header>
        
        {loading ? <DashboardSkeleton /> : (
            <AdvertiserAds userId={user!.id} initialAds={ads} userRole={profileRole} />
        )}
    </div>
  );
}

