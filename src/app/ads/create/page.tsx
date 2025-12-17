
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreateAdForm from "@/components/ads/CreateAdForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function CreateAdPage({ searchParams }: { searchParams: { error?: string }}) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Should be handled by middleware
    redirect("/auth/login?next=/ads/create");
  }

  // Role check is now in middleware, so we can assume the user is an advertiser.
  
  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
       <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Crear un nuevo anuncio</CardTitle>
          <CardDescription>
            Rellena los siguientes campos para publicar tu anuncio en la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {searchParams.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{searchParams.error}</AlertDescription>
              </Alert>
            )}
            <CreateAdForm />
        </CardContent>
      </Card>
    </div>
  )
}
