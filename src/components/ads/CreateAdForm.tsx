
'use client';

import { useState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createAd } from '@/lib/actions/ad-create.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Location } from '@/lib/types';
import { AlertCircle, Star, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Image from 'next/image';
import { cn } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full mt-6">
      {pending ? 'Publicando Anuncio...' : 'Publicar Anuncio'}
    </Button>
  );
}

export default function CreateAdForm() {
  const supabase = createSupabaseBrowserClient();
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [countries, setCountries] = useState<Location[]>([]);
  const [regions, setRegions] = useState<Location[]>([]);
  const [subregions, setSubregions] = useState<Location[]>([]);
  
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  
  useEffect(() => {
    async function getInitialData() {
      const { data: categoryData } = await supabase.from('categories').select('*');
      if (categoryData) setCategories(categoryData);

      const { data: countryData } = await supabase
        .from('locations')
        .select('*')
        .eq('type', 'country')
        .is('parent_id', null)
        .order('name', { ascending: true });
      if (countryData) setCountries(countryData);
    }
    getInitialData();
  }, [supabase]);

  const handleCountryChange = async (countryId: string) => {
    const id = parseInt(countryId, 10);
    setSelectedCountryId(id);
    setSelectedRegionId(null);
    setRegions([]);
    setSubregions([]);
    
    if (id) {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('type', 'region')
        .eq('parent_id', id)
        .order('name', { ascending: true });
      if (data) setRegions(data);
    }
  };

  const handleRegionChange = async (regionId: string) => {
    const id = parseInt(regionId, 10);
    setSelectedRegionId(id);
    setSubregions([]);

    if (id) {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('type', 'subregion')
        .eq('parent_id', id)
        .order('name', { ascending: true });
      if (data) setSubregions(data);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newImages = [...selectedImages, ...filesArray].slice(0, 5);
      setSelectedImages(newImages);

      const newPreviews = newImages.map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    }
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
    if (coverImageIndex === index) {
      setCoverImageIndex(0);
    } else if (coverImageIndex > index) {
      setCoverImageIndex(coverImageIndex - 1);
    }
  };

  return (
    <form action={createAd} className="space-y-6">
      {/* Hidden input for cover image index */}
      <input type="hidden" name="cover_image_index" value={coverImageIndex} />
      
      <div className="space-y-2">
        <Label htmlFor="title">Título del Anuncio</Label>
        <Input 
          id="title" 
          name="title" 
          placeholder="Ej: Alojamiento con vistas al mar" 
          required 
        />
      </div>

       <div className="space-y-2">
        <Label htmlFor="images">Imágenes del Anuncio (hasta 5)</Label>
        <Input 
          id="images" 
          name="images" 
          type="file"
          accept="image/png, image/jpeg, image/webp"
          required 
          multiple
          onChange={handleImageChange}
          ref={fileInputRef}
          className="hidden"
        />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          Seleccionar Imágenes
        </Button>
        <p className="text-xs text-muted-foreground">Sube hasta 5 imágenes para tu anuncio (PNG, JPG, WEBP). La primera imagen será la de portada por defecto.</p>
        
        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative group aspect-square">
                <Image
                  src={preview}
                  alt={`Vista previa ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                  className="object-cover rounded-md"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                   <button
                    type="button"
                    onClick={() => setCoverImageIndex(index)}
                    className={cn(
                      "p-1.5 rounded-full bg-white/70 hover:bg-white",
                      coverImageIndex === index ? "text-yellow-400" : "text-gray-600"
                    )}
                    aria-label="Marcar como portada"
                  >
                    <Star className="h-5 w-5" fill={coverImageIndex === index ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-1.5 rounded-full bg-white/70 text-red-500 hover:bg-white"
                    aria-label="Eliminar imagen"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {coverImageIndex === index && (
                   <div className="absolute top-1 left-1 bg-yellow-400 text-white p-1 rounded-full">
                     <Star className="h-3 w-3" />
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe los detalles de tu anuncio, servicios, etc."
          required
          rows={5}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="category_id">Categoría</Label>
          <Select name="category_id" required>
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
           <Select name="country_id" onValueChange={handleCountryChange} required>
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

      {selectedCountryId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="region_id">Región / Provincia</Label>
            <Select name="region_id" onValueChange={handleRegionChange} required>
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
              <Select name="subregion_id">
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
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Información de Contacto</AlertTitle>
        <AlertDescription>
          La información de contacto (email, WhatsApp, etc.) que configuraste en tu perfil se mostrará en este anuncio. Puedes actualizarla en la sección "Mi Perfil".
        </AlertDescription>
      </Alert>

      <SubmitButton />
    </form>
  );
}
