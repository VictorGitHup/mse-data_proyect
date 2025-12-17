
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createAd, type FormState } from '@/app/ads/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categories, countries } from '@/lib/data';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full mt-6">
      {pending ? 'Publicando Anuncio...' : 'Publicar Anuncio'}
    </Button>
  );
}

export default function CreateAdForm() {
  const initialState: FormState = { message: '', errors: {} };
  const [state, dispatch] = useFormState(createAd, initialState);
  const { toast } = useToast();

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const availableRegions = selectedCountry ? countries.find(c => c.name === selectedCountry)?.regions : [];
  const availableSubregions = selectedRegion ? availableRegions?.find(r => r.name === selectedRegion)?.subregions : [];

  useEffect(() => {
    if (state.message && state.message.startsWith('Error')) {
      toast({
        title: 'Error al crear el anuncio',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form action={dispatch} className="space-y-6">
      {/* Title and Description */}
      <div className="space-y-2">
        <Label htmlFor="title">Título del Anuncio</Label>
        <Input 
          id="title" 
          name="title" 
          placeholder="Ej: Alojamiento con vistas al mar" 
          required 
          aria-describedby="title-error"
        />
        <div id="title-error" aria-live="polite" aria-atomic="true">
          {state.errors?.title &&
            state.errors.title.map((error: string) => (
              <p className="mt-2 text-sm text-destructive" key={error}>
                {error}
              </p>
            ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Describe los detalles de tu anuncio, servicios, etc."
          required
          rows={5}
          aria-describedby="description-error"
        />
        <div id="description-error" aria-live="polite" aria-atomic="true">
          {state.errors?.description &&
            state.errors.description.map((error: string) => (
              <p className="mt-2 text-sm text-destructive" key={error}>
                {error}
              </p>
            ))}
        </div>
      </div>
      
      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoría</Label>
        <Select name="category_id" required>
            <SelectTrigger id="category" aria-describedby="category-error">
                <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
                {categories.map(category => (
                    <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
        <div id="category-error" aria-live="polite" aria-atomic="true">
          {state.errors?.category_id &&
            state.errors.category_id.map((error: string) => (
              <p className="mt-2 text-sm text-destructive" key={error}>
                {error}
              </p>
            ))}
        </div>
      </div>

      {/* Location Selects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Select name="country" required onValueChange={(value) => { setSelectedCountry(value); setSelectedRegion(null); }}>
              <SelectTrigger id="country" aria-describedby="country-error">
                  <SelectValue placeholder="Selecciona un país" />
              </SelectTrigger>
              <SelectContent>
                  {countries.map(country => (
                      <SelectItem key={country.name} value={country.name}>
                          {country.name}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
           <div id="country-error" aria-live="polite" aria-atomic="true">
              {state.errors?.country &&
                state.errors.country.map((error: string) => (
                  <p className="mt-2 text-sm text-destructive" key={error}>
                    {error}
                  </p>
                ))}
            </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Región / Estado</Label>
          <Select name="region" required disabled={!selectedCountry} onValueChange={setSelectedRegion}>
              <SelectTrigger id="region" aria-describedby="region-error">
                  <SelectValue placeholder={selectedCountry ? "Selecciona una región" : "Elige un país primero"} />
              </SelectTrigger>
              <SelectContent>
                  {availableRegions?.map(region => (
                      <SelectItem key={region.name} value={region.name}>
                          {region.name}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
          <div id="region-error" aria-live="polite" aria-atomic="true">
              {state.errors?.region &&
                state.errors.region.map((error: string) => (
                  <p className="mt-2 text-sm text-destructive" key={error}>
                    {error}
                  </p>
                ))}
            </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subregion">Subregión / Ciudad</Label>
          <Select name="subregion" required disabled={!selectedRegion}>
              <SelectTrigger id="subregion" aria-describedby="subregion-error">
                  <SelectValue placeholder={selectedRegion ? "Selecciona una subregión" : "Elige una región primero"} />
              </SelectTrigger>
              <SelectContent>
                  {availableSubregions?.map(subregion => (
                      <SelectItem key={subregion} value={subregion}>
                          {subregion}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
           <div id="subregion-error" aria-live="polite" aria-atomic="true">
              {state.errors?.subregion &&
                state.errors.subregion.map((error: string) => (
                  <p className="mt-2 text-sm text-destructive" key={error}>
                    {error}
                  </p>
                ))}
            </div>
        </div>
      </div>
      
      <SubmitButton />
    </form>
  );
}
