
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreateAdForm from "./CreateAdForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function CreateAdPage() {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/ads/create");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADVERTISER") {
    redirect("/dashboard");
  }
  
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
            <CreateAdForm />
        </CardContent>
      </Card>
    </div>
  )
}
