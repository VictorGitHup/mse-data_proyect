"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('sign_in');
  const [role, setRole] = useState<'USER' | 'ADVERTISER'>('USER');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Verificar si ya está autenticado
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setCheckingSession(false);
      }
    };
    
    checkSession();
  }, [supabase.auth, router]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Validación básica
    if (!email.includes('@') || password.length < 6) {
      toast({
        title: "Datos inválidos",
        description: "Por favor, ingresa un email válido y una contraseña de al menos 6 caracteres.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: role,
            username: email.split('@')[0],
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
        if (data.user.identities && data.user.identities.length === 0) {
          toast({
            title: "Este correo ya fue registrado",
            description: "El correo que ingresaste ya está en uso.",
            variant: "destructive",
          });
        } else {
          setView('check_email');
        }
      }
    } catch (error) {
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message === 'Email not confirmed') {
          toast({
            title: "Email no confirmado",
            description: "Debes confirmar tu correo electrónico.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error al iniciar sesión",
            description: "Credenciales inválidas.",
            variant: "destructive",
          });
        }
        return;
      }

      // Obtener perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        // Crear perfil si no existe
        if (profileError.code === 'PGRST116') {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              role: 'USER',
              username: email.split('@')[0],
              avatar_url: `https://api.dicebear.com/8.x/identicon/svg?seed=${email}`
            });

          if (createError) {
            toast({
              title: "Error al crear perfil",
              description: "Contacta a soporte.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
            return;
          }
          
          // Redirigir según el rol seleccionado durante el registro
          // (esto es complejo, mejor redirigir a home)
          router.push('/');
        } else {
          toast({
            title: "Error al obtener perfil",
            description: "Contacta a soporte.",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Redirigir según rol existente
        if (profile?.role === 'ADVERTISER') {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
      }
      
      router.refresh();
    } catch (error) {
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)]">
      <div className="w-full max-w-md p-8 rounded-lg shadow-md bg-card">
        {view === 'check_email' ? (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">¡Revisa tu correo!</h2>
            <p className="text-foreground mb-4">
              Hemos enviado un enlace de confirmación a:
            </p>
            <p className="font-bold text-primary mb-4">{email}</p>
            <p className="text-sm text-muted-foreground mb-6">
              Haz clic en el enlace para confirmar tu cuenta.
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

            <Button type="submit" disabled={loading} className="mt-4">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {view === 'sign_in' ? 'Iniciando sesión...' : 'Creando cuenta...'}
                </>
              ) : (
                view === 'sign_in' ? 'Iniciar Sesión' : 'Crear Cuenta'
              )}
            </Button>

            <p className="text-sm text-center">
              {view === 'sign_in' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
              <button
                type="button"
                className="ml-1 underline font-semibold"
                onClick={() => {
                  setView(view === 'sign_in' ? 'sign_up' : 'sign_in');
                  setEmail('');
                  setPassword('');
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