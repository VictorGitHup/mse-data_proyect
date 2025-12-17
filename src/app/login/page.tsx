
"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('sign_in');
  const [role, setRole] = useState<'USER' | 'ADVERTISER'>('USER');
  
  const [isPending, startTransition] = useTransition();
  const [checkingSession, setCheckingSession] = useState(true);

  const nextUrl = searchParams.get('next') || '/';

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(nextUrl);
      } else {
        setCheckingSession(false);
      }
    };
    checkSession();
  }, [supabase, router, nextUrl]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      if (password.length < 6) {
        toast({
          title: "Contraseña muy corta",
          description: "La contraseña debe tener al menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      // Step 1: Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
           toast({
            title: "Correo ya registrado",
            description: "Este correo ya está en uso. Intenta iniciar sesión o revisa tu bandeja de entrada para el correo de confirmación.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error en el registro",
            description: signUpError.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (!signUpData.user) {
        toast({
            title: "Error en el registro",
            description: "No se pudo crear el usuario. Por favor, inténtalo de nuevo.",
            variant: "destructive",
        });
        return;
      }

      // Step 2: Insert into profiles table
      const { error: profileError } = await supabase.from('profiles').insert({
        id: signUpData.user.id,
        role: role,
        username: email.split('@')[0],
        avatar_url: `https://api.dicebear.com/8.x/identicon/svg?seed=${email}`
      });

      if (profileError) {
        // Attempt to clean up the user if profile insert fails
        // This requires admin privileges and will fail on the client-side, but it's good practice to log this
        console.error("Profile insert failed, user cleanup might be needed:", profileError);
        toast({
            title: "Error guardando el perfil",
            description: "No se pudo guardar la información de tu perfil. " + profileError.message,
            variant: "destructive",
        });
        return;
      }
      
      setView('check_email');
      toast({
        title: "¡Revisa tu correo!",
        description: `Hemos enviado un enlace de confirmación a ${email}.`
      });
    });
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message === 'Email not confirmed') {
          toast({
            title: "Email no confirmado",
            description: "Por favor, revisa tu bandeja de entrada y confirma tu cuenta.",
            variant: "destructive",
          });
        } else if (error.message === 'Invalid login credentials') {
           toast({
            title: "Credenciales inválidas",
            description: "El correo electrónico o la contraseña son incorrectos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error al iniciar sesión",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }
      
      router.push(nextUrl);
      router.refresh(); 
    });
  };
  
  const loading = isPending || checkingSession;

  if (checkingSession) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)] p-4">
      <div className="w-full max-w-md p-8 rounded-lg shadow-md bg-card">
        {view === 'check_email' ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">¡Revisa tu correo!</h2>
            <p className="text-foreground mb-4">
              Hemos enviado un enlace de confirmación a:
            </p>
            <p className="font-bold text-primary mb-4">{email}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Haz clic en el enlace para finalizar tu registro.
            </p>
            <Button onClick={() => setView('sign_in')}>
              Volver al inicio de sesión
            </Button>
          </div>
        ) : (
          <form
            className="flex-1 flex flex-col w-full justify-center gap-4 text-foreground"
            onSubmit={view === 'sign_in' ? handleSignIn : handleSignUp}
          >
            <h1 className="text-2xl font-bold mb-4 text-center">
              {view === 'sign_in' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h1>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
              {view === 'sign_up' && (
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              )}
            </div>

            {view === 'sign_up' && (
              <div className="space-y-3">
                <Label>Quiero registrarme como:</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value: 'USER' | 'ADVERTISER') => setRole(value)}
                  className="flex items-center gap-6"
                  disabled={loading}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="USER" id="role-user" />
                    <Label htmlFor="role-user" className="font-normal cursor-pointer">
                      Usuario
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ADVERTISER" id="role-advertiser" />
                    <Label htmlFor="role-advertiser" className="font-normal cursor-pointer">
                      Anunciante
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <Button type="submit" disabled={loading} className="mt-4 w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {view === 'sign_in' ? 'Iniciando sesión...' : 'Creando cuenta...'}
                </>
              ) : (
                view === 'sign_in' ? 'Iniciar Sesión' : 'Crear Cuenta'
              )}
            </Button>

            <p className="text-sm text-center mt-4">
              {view === 'sign_in' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
              <button
                type="button"
                className="ml-1 underline font-semibold text-primary"
                onClick={() => {
                  setView(view === 'sign_in' ? 'sign_up' : 'sign_in');
                }}
                disabled={loading}
              >
                {view === 'sign_in' ? 'Regístrate ahora' : 'Inicia sesión'}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
