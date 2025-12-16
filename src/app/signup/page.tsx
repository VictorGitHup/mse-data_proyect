"use client";

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSupabaseBrowserClient } from '@/lib/supabase/client';


export default function Signup() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [view, setView] = useState('sign_up')

  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            router.push('/account');
        }
    };
    checkSession();
  }, [supabase, router]);
  
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    setView('check_email')
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await supabase.auth.signInWithPassword({
      email,
      password,
    })
    router.push('/account');
    router.refresh();
  }

  return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)]">
      <div className="w-full max-w-md p-8 rounded-lg shadow-md bg-card">
        {view === 'check_email' ? (
          <p className="text-center text-foreground">
            Check <span className="font-bold">{email}</span> to continue signing up
          </p>
        ) : (
          <form
            className="flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
            onSubmit={view === 'sign_up' ? handleSignUp : handleSignIn}
          >
            <h1 className="text-2xl font-bold mb-4 text-center">
              {view === 'sign_up' ? 'Crear Cuenta' : 'Iniciar Sesión'}
            </h1>
            <Label htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              placeholder="you@example.com"
            />
            <Label htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              placeholder="••••••••"
            />
            {view === 'sign_up' ? (
              <>
                <Button type="submit">Sign Up</Button>
                <p className="text-sm text-center">
                  Already have an account?
                  <button
                    type="button"
                    className="ml-1 underline"
                    onClick={() => {
                        setView('sign_in');
                        router.push('/login');
                    }}
                  >
                    Sign In Now
                  </button>
                </p>
              </>
            ) : (
              <>
                <Button type="submit">Sign In</Button>
                <p className="text-sm text-center">
                  Don't have an account?
                  <button
                    type="button"
                    className="ml-1 underline"
                    onClick={() => {
                        setView('sign_up');
                        router.push('/signup');
                    }}
                  >
                    Sign Up Now
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
