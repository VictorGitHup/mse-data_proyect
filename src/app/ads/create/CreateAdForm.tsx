
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createAd, type FormState } from '@/app/ads/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Publicando Anuncio...' : 'Publicar Anuncio'}
    </Button>
  );
}

export default function CreateAdForm() {
  const initialState: FormState = { message: '', errors: {} };
  const [state, dispatch] = useFormState(createAd, initialState);
  const { toast } = useToast();

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
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
            <Label htmlFor="location_city">Ciudad</Label>
            <Input 
              id="location_city" 
              name="location_city" 
              placeholder="Ej: Madrid" 
              required 
              aria-describedby="city-error"
            />
             <div id="city-error" aria-live="polite" aria-atomic="true">
              {state.errors?.location_city &&
                state.errors.location_city.map((error: string) => (
                  <p className="mt-2 text-sm text-destructive" key={error}>
                    {error}
                  </p>
                ))}
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="location_country">País</Label>
            <Input 
              id="location_country" 
              name="location_country" 
              placeholder="Ej: España" 
              required 
              aria-describedby="country-error"
            />
             <div id="country-error" aria-live="polite" aria-atomic="true">
              {state.errors?.location_country &&
                state.errors.location_country.map((error: string) => (
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
