
'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { updateAd } from '@/lib/actions/ad-update.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Location, Category } from '@/lib/types';


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full mt-6">
      {pending ? 'Guardando Cambios...' : 'Guardar Cambios'}
    </Button>
  );
}

// Keep a simplified Ad type for props
type AdForForm = {
  id: number;
  title: string;
  description: string;
  category_id: number;
  country_id: number | null;
  region_id: number | null;
  subregion_id: number | null;
};

interface EditAdFormProps {
  ad: AdForForm;
}

export default function EditAdForm({ ad }: EditAdFormProps) {
  const supabase = createSupabaseBrowserClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Location[]>([]);
  const [regions, setRegions] = useState<Location[]>([]);
  const [subregions, setSubregions] = useState<Location[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(ad.country_id);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(ad.region_id);
  
  // Bind the ad ID to the update action
  const updateAdWithId = updateAd.bind(null, ad.id);

  // Effect to load initial data (categories, countries, and then regions/subregions for the specific ad)
  useEffect(() => {
    async function loadInitialData() {
      // 0. Fetch categories
      const { data: categoryData } = await supabase.from('categories').select('*');
      if (categoryData) setCategories(categoryData);

      // 1. Fetch all countries
      const { data: countryData } = await supabase
        .from('locations')
        .select('*')
        .eq('type', 'country')
        .order('name', { ascending: true });
      if (countryData) setCountries(countryData);

      // 2. If a country is pre-selected, fetch its regions
      if (ad.country_id) {
        const { data: regionData } = await supabase
          .from('locations')
          .select('*')
          .eq('type', 'region')
          .eq('parent_id', ad.country_id)
          .order('name', { ascending: true });
        if (regionData) setRegions(regionData);
      }
      
      // 3. If a region is pre-selected, fetch its subregions
      if (ad.region_id) {
        const { data: subregionData } = await supabase
          .from('locations')
          .select('*')
          .eq('type', 'subregion')
          .eq('parent_id', ad.region_id)
          .order('name', { ascending: true });
        if (subregionData) setSubregions(subregionData);
      }
    }

    loadInitialData();
  }, [supabase, ad.country_id, ad.region_id]);


  const handleCountryChange = async (countryId: string) => {
    const id = parseInt(countryId, 10);
    setSelectedCountryId(id);
    // Reset lower levels
    setSelectedRegionId(null);
    setRegions([]);
    setSubregions([]);
    
    if (id) {
      const { data } = await supabase
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
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('type', 'subregion')
        .eq('parent_id', id)
        .order('name', { ascending: true });
      if (data) setSubregions(data);
    }
  };

  return (
    <form action={updateAdWithId} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título del Anuncio</Label>
        <Input 
          id="title" 
          name="title" 
          placeholder="Ej: Alojamiento con vistas al mar" 
          required 
          defaultValue={ad.title}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe los detalles de tu anuncio, servicios, etc."
          required
          rows={5}
          defaultValue={ad.description}
        />
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
            <Select name="region_id" onValueChange={handleRegionChange} required defaultValue={ad.region_id ? String(ad.region_id) : undefined}>
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
