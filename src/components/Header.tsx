
"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { User as UserIcon } from 'lucide-react';
import type { User } from "@supabase/supabase-js";
import { logout } from "@/lib/actions/auth.actions";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  
  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-card border-b">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/" className="font-bold text-xl">
          MiPlataforma
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/account">
                <Button variant="ghost">
                  <UserIcon className="mr-2 h-4 w-4" />
                  {user.email}
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
