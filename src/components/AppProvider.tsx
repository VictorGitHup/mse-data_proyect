"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Define the context shape
interface AppContextType {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
}

// Create the context
export const AppContext = createContext<AppContextType | undefined>(undefined);

// Create the provider component
export default function AppProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const user = session?.user ?? null;
  const router = useRouter();

  useEffect(() => {
    // Fetch the initial session
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }
    getSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        // Optional: redirect on login/logout
        if (_event === 'SIGNED_IN') {
            // Can redirect here, e.g. router.push('/account');
        }
        if (_event === 'SIGNED_OUT') {
            router.push('/');
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const value = {
    supabase,
    session,
    user,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use the app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
