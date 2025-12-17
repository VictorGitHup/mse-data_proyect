
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AdvertiserDashboard from '@/components/ads/AdvertiserDashboard';

export default async function DashboardPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Middleware should handle this, but as a fallback.
    if (!user) {
        redirect('/auth/login');
    }

    const { data: ads, error } = await supabase
        .from('ads')
        .select('id, title, created_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching ads:", error);
        // Handle error appropriately, maybe show a message
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="flex justify-between items-center mb-12">
                <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl">
                    Panel de Anunciante
                </h1>
                <Link href="/ads/create">
                    <Button>Crear Nuevo Anuncio</Button>
                </Link>
            </header>
            <AdvertiserDashboard initialAds={ads || []} />
        </div>
    );
}
