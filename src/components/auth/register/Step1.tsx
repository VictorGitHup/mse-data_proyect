
'use client';

import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RegisterFormValues } from '../RegisterForm';
import { checkUsername } from '@/lib/actions/auth.actions';
import { useState, useTransition, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import debounce from 'lodash.debounce';

interface Step1Props {
  nextStep: () => void;
}

export default function Step1({ nextStep }: Step1Props) {
  const form = useFormContext<RegisterFormValues>();
  const [isChecking, startChecking] = useTransition();
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedCheck = useCallback(
    debounce(async (username: string) => {
      if (username.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      startChecking(async () => {
        const isAvailable = await checkUsername(username);
        setUsernameAvailable(isAvailable);
        if (!isAvailable) {
          form.setError("username", { type: "manual", message: "Este nombre de usuario ya está en uso." });
        } else {
           form.clearErrors("username");
        }
      });
    }, 500),
    [form]
  );

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Correo Electrónico</FormLabel>
            <FormControl>
              <Input type="email" placeholder="tu@correo.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar Contraseña</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Repite la contraseña" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre de Usuario</FormLabel>
            <FormControl>
              <div className="relative">
                <Input placeholder="usuario_unico" {...field} onChange={(e) => {
                  field.onChange(e);
                  debouncedCheck(e.target.value);
                }} />
                {isChecking && <Loader2 className="absolute right-2 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />}
              </div>
            </FormControl>
            <FormMessage />
            {usernameAvailable === true && (
                <p className="text-sm text-green-600">¡Nombre de usuario disponible!</p>
            )}
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="full_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre Completo</FormLabel>
            <FormControl>
              <Input placeholder="Ej: Juan Pérez" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="button" onClick={nextStep} className="w-full mt-4">
        Siguiente
      </Button>
    </div>
  );
}
