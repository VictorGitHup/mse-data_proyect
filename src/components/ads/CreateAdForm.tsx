
'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { createAd } from '@/lib/actions/ad-create.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Location } from '@/lib/types';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

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

  return (
    <form action={createAd} className="space-y-6">
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
        <Label htmlFor="image">Imagen del Anuncio</Label>
        <Input 
          id="image" 
          name="image" 
          type="file"
          accept="image/png, image/jpeg, image/webp"
          required 
        />
        <p className="text-xs text-muted-foreground">Sube una imagen principal para tu anuncio (PNG, JPG, WEBP).</p>
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
