
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import EditAdForm from "@/components/ads/EditAdForm";
import type { Ad } from "@/lib/types";

export default async function ManageAdPage({ params, searchParams }: { params: { id: string }, searchParams: { error?: string } }) {
  const supabase = await createSupabaseServerClient();
  const adId = Number(params.id);

  if (isNaN(adId)) {
    return redirect('/dashboard');
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/dashboard/ads/${adId}/manage`);
  }

  const { data: ad, error } = await supabase
    .from('ads')
    .select('*')
    .eq('id', adId)
    .eq('user_id', user.id)
    .single<Ad>();
  
  if (error || !ad) {
    console.error("Error fetching ad for editing or ad not found:", error);
    // Redirect if the ad doesn't exist or doesn't belong to the user
    return redirect('/dashboard?error=Anuncio no encontrado o no tienes permiso para editarlo.');
  }

  // The EditAdForm now takes the simplified Ad object
  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
       <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Anuncio</CardTitle>
          <CardDescription>
            Modifica los campos que desees y guarda los cambios.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {searchParams.error && (
              <Alert variant="destructive" className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertDescription>{searchParams.error}</AlertDescription>
              </Alert>
            )}
            <EditAdForm ad={ad} />
        </CardContent>
      </Card>
    </div>
  );
}
