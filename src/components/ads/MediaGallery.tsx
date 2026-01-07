
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { deleteMedia, getAdvertiserMedia } from '@/lib/actions/media.actions';
import type { AdMedia } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Trash2, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MediaGalleryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMedia: (media: AdMedia[]) => void;
}

export default function MediaGallery({ isOpen, onOpenChange, onSelectMedia }: MediaGalleryProps) {
  const [mediaItems, setMediaItems] = useState<AdMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<AdMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMedia = () => {
    setIsLoading(true);
    getAdvertiserMedia()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching media:', error);
          toast({ title: 'Error', description: 'No se pudo cargar la galería.', variant: 'destructive' });
        } else if (data) {
          const uniqueMedia = Array.from(new Map(data.map(item => [item.url, item])).values());
          setMediaItems(uniqueMedia);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen]);

  const handleSelect = (item: AdMedia) => {
    setSelectedMedia(prev =>
      prev.some(m => m.id === item.id)
        ? prev.filter(m => m.id !== item.id)
        : [...prev, item]
    );
  };
  
  const handleConfirmSelection = () => {
    onSelectMedia(selectedMedia);
    setSelectedMedia([]);
    onOpenChange(false);
  };

  const handleDeleteMedia = async (mediaId: number) => {
    const { error } = await deleteMedia(mediaId);
    if (error) {
      toast({ title: 'Error al eliminar', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Éxito', description: 'El archivo ha sido eliminado.' });
      setMediaItems(prev => prev.filter(item => item.id !== mediaId));
      setSelectedMedia(prev => prev.filter(item => item.id !== mediaId));
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mi Galería de Medios</DialogTitle>
          <DialogDescription>
            Selecciona imágenes o videos que has subido previamente para agregarlos a tu anuncio, o elimínalos permanentemente.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        ) : (
             <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4">
                {mediaItems.length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground self-center">
                        No has subido ningún contenido multimedia todavía.
                    </div>
                ) : (
                    mediaItems.map(item => {
                        const isSelected = selectedMedia.some(m => m.id === item.id);
                        return (
                            <div
                                key={item.id}
                                className={cn(
                                'relative aspect-square cursor-pointer group rounded-md overflow-hidden border',
                                isSelected && 'ring-2 ring-primary ring-offset-2'
                                )}
                                onClick={() => handleSelect(item)}
                            >
                                {item.type === 'image' ? (
                                <Image
                                    src={item.url}
                                    alt="Galería de medios"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
                                />
                                ) : (
                                <div className='relative w-full h-full'>
                                    <video
                                        src={item.url}
                                        className="object-cover h-full w-full"
                                        muted
                                        playsInline
                                    />
                                    <div className="absolute top-1 left-1 bg-black/50 text-white p-1 rounded-full">
                                       <Video className="h-2 w-2" />
                                     </div>
                                </div>
                                )}
                                <div className="absolute top-2 right-2 z-10">
                                  <Checkbox checked={isSelected} className="bg-white" />
                                </div>
                                <div className="absolute bottom-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => e.stopPropagation()} // Prevent selection when clicking delete
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción es irreversible. El archivo se eliminará permanentemente de tus anuncios y de tu galería.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteMedia(item.id)}>
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        )}

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
            </Button>
            <Button onClick={handleConfirmSelection} disabled={selectedMedia.length === 0}>
                Añadir {selectedMedia.length > 0 ? `(${selectedMedia.length})` : ''}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
