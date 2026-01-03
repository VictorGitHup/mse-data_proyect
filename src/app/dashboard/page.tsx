
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AdvertiserDashboard from '@/components/ads/AdvertiserDashboard';
import { getAdsForAdvertiser } from '@/lib/actions/ad-data.actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: {
    q?: string;
    status?: string;
    page?: string;
  };
}) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Middleware should handle this, but as a fallback.
    if (!user) {
        redirect('/auth/login');
    }

    const query = searchParams?.q || '';
    const status = searchParams?.status || 'all';

    const { data: ads, error } = await getAdsForAdvertiser(query, status);

    if (error) {
        console.error("Error fetching ads:", error);
        // We can show a toast or an error message here. For now, we'll pass an empty array.
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight">
                    Mis Anuncios
                </h1>
                <Link href="/ads/create">
                    <Button>Crear Nuevo Anuncio</Button>
                </Link>
            </header>
            <AdvertiserDashboard initialAds={ads || []} />
        </div>
    );
}
