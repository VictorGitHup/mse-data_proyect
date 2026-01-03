
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
import { AdForTable } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Eye, Edit } from 'lucide-react';

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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead className="hidden md:table-cell">Categoría</TableHead>
            <TableHead className="hidden sm:table-cell">Creado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.map(ad => (
            <TableRow key={ad.id}>
              <TableCell className="font-medium truncate max-w-xs">{ad.title}</TableCell>
              <TableCell className="hidden md:table-cell">{ad.category?.name || 'N/A'}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {format(new Date(ad.created_at), 'dd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(ad.status)} className="capitalize">
                  {getStatusText(ad.status)}
                </Badge>
              </TableCell>
              <TableCell className="flex items-center gap-2">
                <Switch
                  checked={ad.status === 'active'}
                  onCheckedChange={() => handleToggle(ad.id, ad.status)}
                  disabled={isPending || ad.status === 'draft' || ad.status === 'expired'}
                  aria-label="Activar/desactivar anuncio"
                />
                 <Button variant="ghost" size="icon" asChild>
                  <Link href={`/ad/${ad.slug}`} target="_blank">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Ver anuncio</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/dashboard/ads/${ad.id}/manage`}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar anuncio</span>
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
