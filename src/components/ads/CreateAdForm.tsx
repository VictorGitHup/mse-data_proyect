
'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createAd } from '@/lib/actions/ad-create.actions';
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
      {pending ? 'Publicando Anuncio...' : 'Publicar Anuncio'}
    </Button>
  );
}

export default function CreateAdForm() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [subregions, setSubregions] = useState<string[]>([]);

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
          <Label htmlFor="country">País</Label>
           <Select name="country" onValueChange={handleCountryChange} required>
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
            <Select name="region" onValueChange={handleRegionChange} required>
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
              <Select name="subregion" required>
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
