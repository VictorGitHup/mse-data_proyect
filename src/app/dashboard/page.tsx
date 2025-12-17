
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function DashboardPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // This is handled by middleware, but as a fallback.
        redirect('/auth/login');
    }

    // This is a placeholder dashboard.
    // We will build the full advertiser dashboard here later.
    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="flex justify-between items-center mb-12">
                <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
                    Panel de Anunciante
                </h1>
                <Link href="/dashboard/ads/create">
                    <Button>Crear Nuevo Anuncio</Button>
                </Link>
            </header>
            <div className="border-2 border-dashed rounded-lg p-16 text-center">
                <h2 className="text-2xl font-semibold">Bienvenido a tu Panel</h2>
                <p className="text-muted-foreground mt-2">
                    Aquí aparecerán tus anuncios una vez los hayas creado.
                </p>
            </div>
        </div>
    );
}
