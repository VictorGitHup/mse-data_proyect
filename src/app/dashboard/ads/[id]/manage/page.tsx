
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Terminal, MessageSquare } from "lucide-react";
import EditAdForm from "@/components/ads/EditAdForm";
import type { AdWithMedia, AdCommentWithProfile } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdCommentsForModeration } from "@/lib/actions/ratings-comments.actions";
import CommentsModeration from "@/components/ads/CommentsModeration";

export default async function ManageAdPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string }, 
  searchParams: { error?: string, tab?: string } 
}) {
  const supabase = await createSupabaseServerClient();
  const adId = Number(params.id);

  if (isNaN(adId)) {
    return redirect('/dashboard');
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/dashboard/ads/${adId}/manage`);
  }

  const [adResult, commentsResult] = await Promise.all([
    supabase
      .from('ads')
      .select('*, ad_media(*)')
      .eq('id', adId)
      .eq('user_id', user.id)
      .single<AdWithMedia>(),
    getAdCommentsForModeration(adId)
  ]);
  
  const { data: ad, error: adError } = adResult;
  const { data: comments, error: commentsError } = commentsResult;

  if (adError || !ad) {
    console.error("Error fetching ad for editing or ad not found:", adError);
    return redirect('/dashboard?error=Anuncio no encontrado o no tienes permiso para editarlo.');
  }

  if (commentsError) {
    console.error("Error fetching comments for moderation:", commentsError);
    // Continue without comments if there's an error
  }
  
  const initialComments = comments as AdCommentWithProfile[] || [];

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
       <Card className="w-full max-w-4xl">
        <CardContent className="p-0">
          <Tabs defaultValue={searchParams.tab || "details"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-b-none rounded-t-lg">
              <TabsTrigger value="details">Detalles del Anuncio</TabsTrigger>
              <TabsTrigger value="comments">
                Comentarios
                {initialComments.filter(c => c.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground h-5 w-5 text-xs rounded-full flex items-center justify-center">
                    {initialComments.filter(c => c.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <div className="p-6">
              {searchParams.error && (
                <Alert variant="destructive" className="mb-4">
                  <Terminal className="h-4 w-4" />
                  <AlertDescription>{searchParams.error}</AlertDescription>
                </Alert>
              )}
              <TabsContent value="details">
                <EditAdForm ad={ad} />
              </TabsContent>
              <TabsContent value="comments">
                <CommentsModeration adId={adId} initialComments={initialComments} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
