
'use client';

import { useFormContext, useFormStatus } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { User, Megaphone } from 'lucide-react';
import { RegisterFormValues } from '../RegisterForm';

interface Step2Props {
  prevStep: () => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Creando cuenta...' : 'Crear Cuenta'}
    </Button>
  );
}

export default function Step2({ prevStep }: Step2Props) {
  const { control, watch } = useFormContext<RegisterFormValues>();
  const selectedRole = watch('role');

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="role"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <FormLabel className="text-base">Selecciona tu tipo de cuenta</FormLabel>
            <FormControl>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => field.onChange('USER')}>
                  <Card className={cn(
                    "cursor-pointer transition-all",
                    selectedRole === 'USER' ? 'border-primary ring-2 ring-primary' : 'hover:border-gray-400'
                  )}>
                    <CardHeader className="items-center text-center">
                      <User className="h-10 w-10 mb-2 text-primary" />
                      <CardTitle>Usuario Estándar</CardTitle>
                      <CardDescription className="text-xs">Buscar y contactar anuncios</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
                <div onClick={() => field.onChange('ADVERTISER')}>
                  <Card className={cn(
                    "cursor-pointer transition-all",
                    selectedRole === 'ADVERTISER' ? 'border-primary ring-2 ring-primary' : 'hover:border-gray-400'
                  )}>
                    <CardHeader className="items-center text-center">
                      <Megaphone className="h-10 w-10 mb-2 text-primary" />
                      <CardTitle>Anunciante</CardTitle>
                      <CardDescription className="text-xs">Publicar mis clasificados</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="accept_terms"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>
                Acepto los términos y condiciones de servicio.
              </FormLabel>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      <div className="flex justify-between items-center mt-6">
        <Button type="button" variant="outline" onClick={prevStep}>
          Atrás
        </Button>
        <SubmitButton />
      </div>
    </div>
  );
}
