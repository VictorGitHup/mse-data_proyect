'use client';

import { useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { toggleAdStatus } from '@/lib/actions/ad-status.actions';
import { boostAd } from '@/lib/actions/boost.actions';
import { AdForTable } from '@/lib/types';
import { format, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Eye, Edit, Rocket } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AdsTableProps {
  ads: AdForTable[];
  setAds: React.Dispatch<React.SetStateAction<AdForTable[]>>;
}

export default function AdsTable({ ads, setAds }: AdsTableProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggle = (adId: number, currentStatus: AdForTable['status']) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    startTransition(async () => {
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

  const handleBoost = (adId: number) => {
    startTransition(async () => {
      const result = await boostAd(adId);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        setAds(prevAds => 
          prevAds.map(ad => 
            ad.id === adId ? { ...ad, boosted_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } : ad
          )
        );
        toast({ title: '¡Anuncio destacado!', description: 'Tu anuncio aparecerá en los primeros resultados durante 7 días.' });
      }
    });
  };

  const getStatusVariant = (status: AdForTable['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'expired':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: AdForTable['status']) => {
    const texts = {
        active: 'Activo',
        inactive: 'Inactivo',
        draft: 'Borrador',
        expired: 'Expirado',
    };
    return texts[status] || 'Desconocido';
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Categoría</TableHead>
              <TableHead className="hidden sm:table-cell">Creado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ads.map(ad => {
              const isBoosted = ad.boosted_until && isFuture(new Date(ad.boosted_until));
              return (
              <TableRow key={ad.id} className={isBoosted ? 'bg-yellow-50/50' : ''}>
                <TableCell className="font-medium truncate max-w-xs flex items-center gap-2">
                   {isBoosted && <Rocket className="h-4 w-4 text-yellow-500" />}
                  {ad.title}
                </TableCell>
                <TableCell className="hidden md:table-cell">{ad.category?.name || 'N/A'}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {format(new Date(ad.created_at), 'dd MMM yyyy', { locale: es })}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(ad.status)} className="capitalize">
                    {getStatusText(ad.status)}
                  </Badge>
                </TableCell>
                <TableCell className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleBoost(ad.id)}
                        disabled={isPending || ad.status !== 'active'}
                      >
                        <Rocket className="h-4 w-4" />
                        <span className="sr-only">Destacar anuncio</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Destacar por 7 días</p>
                    </TooltipContent>
                  </Tooltip>
                  <Switch
                    checked={ad.status === 'active'}
                    onCheckedChange={() => handleToggle(ad.id, ad.status)}
                    disabled={isPending || ad.status === 'draft' || ad.status === 'expired'}
                    aria-label="Activar/desactivar anuncio"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/ad/${ad.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver anuncio</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver anuncio público</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/ads/${ad.id}/manage`}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar anuncio</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Gestionar anuncio</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
