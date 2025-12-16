"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { session } = useApp();
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState('');

  useEffect(() => {
    if (session) {
      router.push("/account");
    }
  }, [session, router]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRedirectUrl(`${window.location.origin}/auth/callback`);
    }
  }, []);

  if (!redirectUrl) {
    return null; // O un spinner de carga
  }

  return (
    <div className="flex justify-center items-center h-[calc(100vh-80px)]">
      <div className="w-full max-w-md p-8 rounded-lg shadow-md bg-card">
        <h1 className="text-2xl font-bold mb-4 text-center">Iniciar Sesión</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
          redirectTo={redirectUrl}
        />
      </div>
    </div>
  );
}
