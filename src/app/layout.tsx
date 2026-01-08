
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Next Starter',
  description: 'A clean and stable Next.js starter project.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link 
          rel="preconnect" 
          href="https://fonts.gstatic.com" 
          crossOrigin="" 
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <Header user={user} profile={profile} />
        <main className="flex-grow">{children}</main>
        <Toaster />
        <Footer />
      </body>
    </html>
  );
}
