'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { toggleAdStatus } from '@/lib/actions/ad-status.actions';

type Ad = {
  id: number;
  title: string;
  created_at: string;
  status: 'active' | 'inactive' | 'draft' | 'expired';
};

interface AdvertiserDashboardProps {
  initialAds: Ad[];
}

export default function AdvertiserDashboard({ initialAds }: AdvertiserDashboardProps) {
  const [ads, setAds] = useState<Ad[]>(initialAds);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggle = (adId: number, currentStatus: Ad['status']) => {
    startTransition(async () => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      try {
        await toggleAdStatus(adId, newStatus);
        setAds(prevAds => 
          prevAds.map(ad => 
            ad.id === adId ? { ...ad, status: newStatus } : ad
          )
        );
        toast({
          title: 'Estado actualizado',
          description: `El anuncio ha sido ${newStatus === 'active' ? 'activado' : 'desactivado'}.`,
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
  
  const isActive = (status: Ad['status']) => status === 'active';

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
                  checked={isActive(ad.status)}
                  onCheckedChange={() => handleToggle(ad.id, ad.status)}
                  disabled={isPending || ad.status === 'draft' || ad.status === 'expired'}
                  aria-label="Estado del anuncio"
                />
                <Label htmlFor={`status-${ad.id}`} className={isActive(ad.status) ? 'text-green-600' : 'text-red-600'}>
                  {isActive(ad.status) ? 'Activo' : 'Inactivo'}
                </Label>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/ads/${ad.id}/manage`}>Gestionar</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
