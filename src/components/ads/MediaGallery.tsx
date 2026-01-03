
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
import { Button } from '@/components/ui/button';
import { getAdvertiserMedia } from '@/lib/actions/media.actions';
import type { AdMedia } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '../ui/loading-spinner';

interface MediaGalleryProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMedia: (media: AdMedia[]) => void;
}

export default function MediaGallery({ isOpen, onOpenChange, onSelectMedia }: MediaGalleryProps) {
  const [mediaItems, setMediaItems] = useState<AdMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<AdMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getAdvertiserMedia()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching media:', error);
            // Handle error, e.g., show a toast
          } else if (data) {
            // Remove duplicates based on URL
            const uniqueMedia = Array.from(new Map(data.map(item => [item.url, item])).values());
            setMediaItems(uniqueMedia);
          }
        })
        .finally(() => setIsLoading(false));
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


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mi Galería de Medios</DialogTitle>
          <DialogDescription>
            Selecciona imágenes o videos que has subido previamente para agregarlos a tu anuncio.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner />
            </div>
        ) : (
             <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-4">
                {mediaItems.length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground">
                        No has subido ningún contenido multimedia todavía.
                    </div>
                ) : (
                    mediaItems.map(item => {
                        const isSelected = selectedMedia.some(m => m.id === item.id);
                        return (
                            <div
                                key={item.id}
                                className={cn(
                                'relative aspect-square cursor-pointer group rounded-md overflow-hidden',
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
                                <video
                                    src={item.url}
                                    className="object-cover h-full w-full"
                                    muted
                                    playsInline
                                />
                                )}
                                <div className="absolute top-2 right-2">
                                <Checkbox checked={isSelected} className="bg-white" />
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
