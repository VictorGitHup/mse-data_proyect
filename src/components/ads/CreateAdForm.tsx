'use client';

import { useFormStatus } from 'react-dom';
import { createAd } from '@/lib/actions/ads.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full mt-6">
      {pending ? 'Publicando Anuncio...' : 'Publicar Anuncio'}
    </Button>
  );
}

export default function CreateAdForm() {
  // The form state will be handled by react-hook-form or a similar library later.
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
      <SubmitButton />
    </form>
  );
}
