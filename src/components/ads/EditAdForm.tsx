
'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { updateAd } from '@/lib/actions/ad-update.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categories, countries } from '@/lib/data';
import type { Region } from '@/lib/data';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full mt-6">
      {pending ? 'Guardando Cambios...' : 'Guardar Cambios'}
    </Button>
  );
}

// Infer the type from the query in the page component
type Ad = {
  id: number;
  user_id: string;
  title: string;
  description: string;
  category_id: number;
  country_id: number;
  region_id: number;
  subregion_id: number | null;
  slug: string;
  status: "active" | "inactive" | "draft" | "expired";
  created_at: string;
  updated_at: string | null;
  country: string | null;
  region: string | null;
  subregion: string | null;
};

interface EditAdFormProps {
  ad: Ad;
}

export default function EditAdForm({ ad }: EditAdFormProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(ad.country);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(ad.region);
  const [regions, setRegions] = useState<Region[]>([]);
  const [subregions, setSubregions] = useState<string[]>([]);
  
  // Bind the ad ID to the update action
  const updateAdWithId = updateAd.bind(null, ad.id);

  useEffect(() => {
    // Initialize regions based on the ad's country
    if (ad.country) {
      const countryData = countries.find(c => c.name === ad.country);
      if (countryData) {
        setRegions(countryData.regions);
      }
    }
  }, [ad.country]);

  useEffect(() => {
    // Initialize subregions based on the ad's region
    if (ad.region && regions.length > 0) {
      const regionData = regions.find(r => r.name === ad.region);
      if (regionData) {
        setSubregions(regionData.subregions);
      }
    }
  }, [ad.region, regions]);


  const handleCountryChange = (countryName: string) => {
    setSelectedCountry(countryName);
    setSelectedRegion(null);
    setSubregions([]);
    const country = countries.find(c => c.name === countryName);
    setRegions(country ? country.regions : []);
  };

  const handleRegionChange = (regionName: string) => {
    setSelectedRegion(regionName);
    const region = regions.find(r => r.name === regionName);
    setSubregions(region ? region.subregions : []);
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
          <Label htmlFor="country">País</Label>
           <Select name="country" onValueChange={handleCountryChange} required defaultValue={ad.country || undefined}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Selecciona un país" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.name} value={country.name}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCountry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="region">Región / Provincia</Label>
            <Select name="region" onValueChange={handleRegionChange} required defaultValue={ad.region || undefined}>
              <SelectTrigger id="region">
                <SelectValue placeholder="Selecciona una región" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.name} value={region.name}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRegion && subregions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subregion">Ciudad / Subregión</Label>
              <Select name="subregion" required defaultValue={ad.subregion || undefined}>
                <SelectTrigger id="subregion">
                  <SelectValue placeholder="Selecciona una subregión" />
                </SelectTrigger>
                <SelectContent>
                  {subregions.map((subregion) => (
                    <SelectItem key={subregion} value={subregion}>
                      {subregion}
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
