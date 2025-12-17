
"use client";

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { AuthError } from '@supabase/supabase-js';

export default function Login() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter()
  const { toast } = useToast();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [view, setView] = useState('sign_in')
  const [role, setRole] = useState<'USER' | 'ADVERTISER'>('USER');

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: {
          role: role,
          username: email.split('@')[0], // Default username
          avatar_url: `https://api.dicebear.com/8.x/identicon/svg?seed=${email}`
        }
      },
    });

    if (error) {
        toast({
            title: "Error en el registro",
            description: error.message,
            variant: "destructive",
        });
    } else if (data.user) {
        // Supabase sends a confirmation email, but might return a user object
        // if the user is already registered but unconfirmed.
        if (data.user.identities && data.user.identities.length === 0) {
             toast({
                title: "Este correo ya fue registrado",
                description: "El correo que ingresaste ya está en uso. Por favor, inicia sesión o revisa tu bandeja de entrada para el email de confirmación.",
                variant: "destructive",
            });
        } else {
            setView('check_email');
        }
    }
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
        if (error.message === 'Email not confirmed') {
            toast({
                title: "Email no confirmado",
                description: "Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
                variant: "destructive",
            });
        } else {
            toast({
                title: "Error al iniciar sesión",
                description: "Credenciales inválidas. Por favor, inténtalo de nuevo.",
                variant: "destructive",
            });
        }
    } else if (data.user) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError && profileError.code !== 'PGRST116') { //PGRST116 means no rows found
             toast({
                title: "Error al obtener el perfil",
                description: "No se pudo encontrar tu perfil. Por favor, contacta a soporte.",
                variant: "destructive",
            });
            await supabase.auth.signOut(); // Log out user if profile is missing
            return;
        }
        
        if (profile?.role === 'ADVERTISER') {
            router.push('/dashboard');
        } else {
            router.push('/');
        }
        router.refresh();
    }
  }

  return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)]">
      <div className="w-full max-w-md p-8 rounded-lg shadow-md bg-card">
        {view === 'check_email' ? (
          <p className="text-center text-foreground">
            Revisa tu correo <span className="font-bold">{email}</span> para completar tu registro.
          </p>
        ) : (
          <form
            className="flex-1 flex flex-col w-full justify-center gap-4 text-foreground"
            onSubmit={view === 'sign_in' ? handleSignIn : handleSignUp}
          >
            <h1 className="text-2xl font-bold mb-4 text-center">
              {view === 'sign_in' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h1>
            
            <div className="space-y-2">
                <Label htmlFor="email">
                Email
                </Label>
                <Input
                id="email"
                name="email"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                placeholder="you@example.com"
                required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">
                Contraseña
                </Label>
                <Input
                id="password"
                type="password"
                name="password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                placeholder="••••••••"
                required
                />
            </div>

            {view === 'sign_up' && (
              <div className="space-y-3">
                <Label>Quiero registrarme como:</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value: 'USER' | 'ADVERTISER') => setRole(value)}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="USER" id="role-user" />
                    <Label htmlFor="role-user" className="font-normal">
                      Usuario
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ADVERTISER" id="role-advertiser" />
                    <Label htmlFor="role-advertiser" className="font-normal">
                      Anunciante
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {view === 'sign_in' ? (
              <>
                <Button type="submit" className="mt-4">Iniciar Sesión</Button>
                <p className="text-sm text-center">
                  ¿No tienes una cuenta?
                  <button
                    type="button"
                    className="ml-1 underline font-semibold"
                    onClick={() => setView('sign_up')}
                  >
                    Regístrate ahora
                  </button>
                </p>
              </>
            ) : (
               <>
                <Button type="submit" className="mt-4">Crear Cuenta</Button>
                <p className="text-sm text-center">
                  ¿Ya tienes una cuenta?
                  <button
                    type="button"
                    className="ml-1 underline font-semibold"
                    onClick={() => setView('sign_in')}
                  >
                    Inicia sesión
                  </button>
                </p>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
