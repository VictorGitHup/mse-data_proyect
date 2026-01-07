
'use client';

import { useState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { updateAd } from '@/lib/actions/ad-update.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Location, Category, AdMedia, AdWithMedia } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Star, X, ImagePlus, Video } from 'lucide-react';

type MediaFile = {
  file: File;
  preview: string;
  type: 'image' | 'video';
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full mt-6">
      {pending ? 'Guardando Cambios...' : 'Guardar Cambios'}
    </Button>
  );
}

interface EditAdFormProps {
  ad: AdWithMedia;
}

export default function EditAdForm({ ad }: EditAdFormProps) {
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Location[]>([]);
  const [regions, setRegions] = useState<Location[]>([]);
  const [subregions, setSubregions] = useState<Location[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(ad.country_id);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(ad.region_id);
  
  const [existingMedia, setExistingMedia] = useState<AdMedia[]>(ad.ad_media || []);
  const [newMediaFiles, setNewMediaFiles] = useState<MediaFile[]>([]);
  const [mediaToDelete, setMediaToDelete] = useState<number[]>([]);
  const [coverImage, setCoverImage] = useState<{ type: 'existing' | 'new'; value: number | string } | null>(null);

  useEffect(() => {
    const cover = (ad.ad_media || []).find(m => m.is_cover);
    if (cover) {
      setCoverImage({ type: 'existing', value: cover.id });
    }
  }, [ad.ad_media]);
  
  useEffect(() => {
    async function loadInitialData() {
      const { data: categoryData } = await supabase.from('categories').select('*');
      if (categoryData) setCategories(categoryData);

      const { data: countryData } = await supabase.from('locations').select('*').eq('type', 'country').order('name', { ascending: true });
      if (countryData) setCountries(countryData);

      if (ad.country_id) {
        const { data: regionData } = await supabase.from('locations').select('*').eq('type', 'region').eq('parent_id', ad.country_id).order('name', { ascending: true });
        if (regionData) setRegions(regionData);
      }
      
      if (ad.region_id) {
        const { data: subregionData } = await supabase.from('locations').select('*').eq('type', 'subregion').eq('parent_id', ad.region_id).order('name', { ascending: true });
        if (subregionData) setSubregions(subregionData);
      }
    }

    loadInitialData();
  }, [supabase, ad.country_id, ad.region_id]);


  const handleCountryChange = async (countryId: string) => {
    const id = parseInt(countryId, 10);
    setSelectedCountryId(id);
    setSelectedRegionId(null);
    setRegions([]);
    setSubregions([]);
    if (id) {
      const { data } = await supabase.from('locations').select('*').eq('type', 'region').eq('parent_id', id).order('name', { ascending: true });
      if (data) setRegions(data);
    }
  };

  const handleRegionChange = async (regionId: string) => {
    const id = parseInt(regionId, 10);
    setSelectedRegionId(id);
    setSubregions([]);
    if (id) {
      const { data } = await supabase.from('locations').select('*').eq('type', 'subregion').eq('parent_id', id).order('name', { ascending: true });
      if (data) setSubregions(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalMediaCount = existingMedia.length + newMediaFiles.length;
      
      const currentVideosCount = existingMedia.filter(m => m.type === 'video').length + newMediaFiles.filter(m => m.type === 'video').length;
      let newVideosCount = 0;

      const newlySelectedFiles = filesArray.reduce((acc, file) => {
        const isVideo = file.type.startsWith('video');
        if (isVideo) {
            if (currentVideosCount + newVideosCount >= 1) {
                toast({ title: 'Límite de video alcanzado', description: 'Solo puedes subir un video por anuncio.', variant: 'destructive' });
                return acc;
            }
            newVideosCount++;
        }
        acc.push({ file, preview: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' });
        return acc;
      }, [] as MediaFile[]);

      if (totalMediaCount + newlySelectedFiles.length > 5) {
        toast({ title: 'Límite de archivos alcanzado', description: 'Puedes subir un máximo de 5 archivos.', variant: 'destructive' });
      }

      setNewMediaFiles(prev => [...prev, ...newlySelectedFiles].slice(0, 5 - existingMedia.length));
    }
  };

  const removeExistingMedia = (id: number) => {
    setExistingMedia(prev => prev.filter(m => m.id !== id));
    setMediaToDelete(prev => [...prev, id]);
    if (coverImage?.type === 'existing' && coverImage.value === id) {
      setCoverImage(null);
    }
  };

  const removeNewMedia = (index: number) => {
    const fileToRemove = newMediaFiles[index];
    setNewMediaFiles(prev => prev.filter((_, i) => i !== index));
    if (coverImage?.type === 'new' && coverImage.value === fileToRemove.preview) {
      setCoverImage(null);
    }
  };

  const formAction = async (formData: FormData) => {
    newMediaFiles.forEach(media => formData.append('new_media', media.file));
    formData.append('media_to_delete', JSON.stringify(mediaToDelete));
    if (coverImage) {
      formData.append('cover_image', JSON.stringify(coverImage));
    }
    
    await updateAd(ad.id, formData);
  };

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título del Anuncio</Label>
        <Input id="title" name="title" required defaultValue={ad.title} />
      </div>

      <div className="space-y-2">
          <Label htmlFor="media">Imágenes y Videos (hasta 5 archivos, 1 video máx.)</Label>
          <Input 
            id="media" 
            name="media-upload"
            type="file"
            accept="image/png, image/jpeg, image/webp, video/mp4, video/quicktime"
            multiple
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
            disabled={existingMedia.length + newMediaFiles.length >= 5}
          />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={existingMedia.length + newMediaFiles.length >= 5}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Añadir Archivos
          </Button>
          <p className="text-xs text-muted-foreground">
            {5 - (existingMedia.length + newMediaFiles.length)} espacios restantes. La primera imagen será la portada por defecto.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-4">
              {existingMedia.map((media) => (
                <div key={media.id} className="relative group aspect-square">
                  {media.type === 'image' ? (
                    <Image src={media.url} alt="Media existente" fill sizes="20vw" className="object-cover rounded-md" />
                  ) : (
                    <video src={media.url} muted loop playsInline className="object-cover rounded-md w-full h-full" />
                  )}
                   {media.type === 'video' && <div className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full"><Video className="h-3 w-3" /></div>}
                  <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     {media.type === 'image' && (
                        <button type="button" onClick={() => setCoverImage({ type: 'existing', value: media.id })} className={cn("p-1.5 rounded-full bg-white/70 hover:bg-white", coverImage?.type === 'existing' && coverImage.value === media.id ? "text-yellow-400" : "text-gray-600")}><Star className="h-5 w-5" fill={coverImage?.type === 'existing' && coverImage.value === media.id ? "currentColor" : "none"} /></button>
                      )}
                    <button type="button" onClick={() => removeExistingMedia(media.id)} className="p-1.5 rounded-full bg-white/70 text-red-500 hover:bg-white"><X className="h-5 w-5" /></button>
                  </div>
                  {coverImage?.type === 'existing' && coverImage.value === media.id && media.type === 'image' && <div className="absolute top-1 left-1 bg-yellow-400 text-white p-1 rounded-full"><Star className="h-3 w-3" /></div>}
                </div>
              ))}
              {newMediaFiles.map((media, index) => (
                <div key={media.preview} className="relative group aspect-square">
                  {media.type === 'image' ? (
                    <Image src={media.preview} alt={`Vista previa ${index + 1}`} fill sizes="20vw" className="object-cover rounded-md" />
                  ) : (
                     <video src={media.preview} muted loop playsInline className="object-cover rounded-md w-full h-full" />
                  )}
                  {media.type === 'video' && <div className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full"><Video className="h-3 w-3" /></div>}
                  <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     {media.type === 'image' && (
                        <button type="button" onClick={() => setCoverImage({ type: 'new', value: media.preview })} className={cn("p-1.5 rounded-full bg-white/70 hover:bg-white", coverImage?.type === 'new' && coverImage.value === media.preview ? "text-yellow-400" : "text-gray-600")}><Star className="h-5 w-5" fill={coverImage?.type === 'new' && coverImage.value === media.preview ? "currentColor" : "none"} /></button>
                     )}
                    <button type="button" onClick={() => removeNewMedia(index)} className="p-1.5 rounded-full bg-white/70 text-red-500 hover:bg-white"><X className="h-5 w-5" /></button>
                  </div>
                  {coverImage?.type === 'new' && coverImage.value === media.preview && media.type === 'image' && <div className="absolute top-1 left-1 bg-yellow-400 text-white p-1 rounded-full"><Star className="h-3 w-3" /></div>}
                </div>
              ))}
            </div>
        </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" name="description" required rows={5} defaultValue={ad.description} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="category_id">Categoría</Label>
          <Select name="category_id" required defaultValue={String(ad.category_id)}>
            <SelectTrigger id="category_id">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="country_id">País</Label>
           <Select name="country_id" onValueChange={handleCountryChange} required defaultValue={ad.country_id ? String(ad.country_id) : undefined}>
            <SelectTrigger id="country_id">
              <SelectValue placeholder="Selecciona un país" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={String(country.id)}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCountryId && regions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="region_id">Región / Provincia</Label>
            <Select name="region_id" onValueChange={handleRegionChange} required={regions.length > 0} defaultValue={ad.region_id ? String(ad.region_id) : undefined}>
              <SelectTrigger id="region_id">
                <SelectValue placeholder="Selecciona una región" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={String(region.id)}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRegionId && subregions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subregion_id">Ciudad / Subregión</Label>
              <Select name="subregion_id" defaultValue={ad.subregion_id ? String(ad.subregion_id) : undefined}>
                <SelectTrigger id="subregion_id">
                  <SelectValue placeholder="Selecciona una subregión" />
                </SelectTrigger>
                <SelectContent>
                  {subregions.map((subregion) => (
                    <SelectItem key={subregion.id} value={String(subregion.id)}>
                      {subregion.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
