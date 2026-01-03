
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdForTable } from '@/lib/types';
import DashboardToolbar from './DashboardToolbar';
import AdsTable from './AdsTable';

interface AdvertiserDashboardProps {
  initialAds: AdForTable[];
}

export default function AdvertiserDashboard({ initialAds }: AdvertiserDashboardProps) {
  const [ads, setAds] = useState<AdForTable[]>(initialAds);

  if (initialAds.length === 0) {
    return (
      <div className="text-center p-16 border-2 border-dashed rounded-lg">
        <h2 className="text-2xl font-semibold">No se encontraron anuncios</h2>
        <p className="text-muted-foreground mt-2">
          Intenta ajustar tu búsqueda o crea tu primer anuncio.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Anuncios</CardTitle>
        <DashboardToolbar />
      </CardHeader>
      <CardContent>
        <AdsTable ads={ads} setAds={setAds} />
      </CardContent>
    </Card>
  );
}
