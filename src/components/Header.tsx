
'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { User as UserIcon, LayoutDashboard, PlusCircle, LogOut, Menu } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { logout } from '@/lib/actions/auth.actions';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from './ui/sheet';

type Profile = {
  role: 'USER' | 'ADVERTISER';
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

  const navLinks = (
    <>
      {user ? (
        <>
          {isAdvertiser && (
            <>
              <Link href="/dashboard" className="w-full">
                <Button variant="ghost" className="w-full justify-start">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/ads/create" className="w-full">
                <Button variant="ghost" className="w-full justify-start">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear Anuncio
                </Button>
              </Link>
            </>
          )}
          <Link href="/account" className="w-full">
            <Button variant="ghost" className="w-full justify-start">
              <UserIcon className="mr-2 h-4 w-4" />
              Mi Perfil
            </Button>
          </Link>
          <form action={handleLogout} className="w-full">
            <Button type="submit" variant="destructive" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </form>
        </>
      ) : (
        <>
          <Link href="/auth/login" className="w-full">
            <Button variant="ghost" className="w-full justify-start">Login</Button>
          </Link>
          <Link href="/auth/register" className="w-full">
            <Button className="w-full justify-start">Sign Up</Button>
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/" className="font-bold text-xl">
          MiPlataforma
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {navLinks}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] p-4">
              <nav className="flex flex-col items-start gap-4 mt-8">
                 {/* SheetClose can be used to wrap navLinks to close on navigation, but it's better for UX to let user close it manually */}
                 {navLinks}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
