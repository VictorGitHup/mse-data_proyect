"use client";

import Link from "next/link";
import { useApp } from "./AppProvider";
import { Button } from "./ui/button";
import { User as UserIcon } from 'lucide-react';

export default function Header() {
  const { session, user, supabase } = useApp();

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
              <Button onClick={handleLogout} variant="destructive">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
