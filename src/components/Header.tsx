
"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { User as UserIcon, LayoutDashboard, PlusCircle } from 'lucide-react';
import type { User } from "@supabase/supabase-js";
import { logout } from "@/lib/actions/auth.actions";

type Profile = {
  role: "USER" | "ADVERTISER";
} | null;

interface HeaderProps {
  user: User | null;
  profile: Profile;
}

export default function Header({ user, profile }: HeaderProps) {
  
  const handleLogout = async () => {
    await logout();
  };

  const isAdvertiser = profile?.role === 'ADVERTISER';

  return (
    <header className="bg-card border-b">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/" className="font-bold text-xl">
          MiPlataforma
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              {isAdvertiser && (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                   <Link href="/ads/create">
                    <Button variant="ghost">
                       <PlusCircle className="mr-2 h-4 w-4" />
                      Crear Anuncio
                    </Button>
                  </Link>
                </>
              )}
              <Link href="/account">
                <Button variant="ghost">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Mi Perfil
                </Button>
              </Link>
              <form action={handleLogout}>
                <Button type="submit" variant="destructive">
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
