import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProvider from '@/components/AppProvider';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Next Starter',
  description: 'A clean and stable Next.js starter project.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AppProvider>
          <Header />
          {children}
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
