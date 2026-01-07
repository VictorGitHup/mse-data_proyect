
'use client';

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Send, Link as LinkIcon, User as UserIcon, MapPin, Video, Star, Rocket } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { AdWithRelations, AdForCard, AdCommentWithProfile } from "@/lib/types";
import AdCard from "./AdCard";
import CommentSection from "./ratings/CommentSection";
import { isFuture } from "date-fns";

interface AdViewProps {
  ad: AdWithRelations;
  similarAds: AdForCard[];
  initialAverageRating: number;
  initialRatingCount: number;
  initialComments: AdCommentWithProfile[];
  currentUser: User | null;
  initialUserRating: number;
}

export default function AdView({ 
  ad, 
  similarAds,
  initialAverageRating,
  initialRatingCount,
  initialComments,
  currentUser,
  initialUserRating,
}: AdViewProps) {
  const advertiser = ad.profiles;
  const advertiserCountry = advertiser.country;
  
  const [averageRating, setAverageRating] = useState(initialAverageRating);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);

  const handleNewRating = (newAverage: number, newCount: number) => {
    setAverageRating(newAverage);
    setRatingCount(newCount);
  };
  
  const fullWhatsappNumber = (advertiserCountry?.phone_code && advertiser.contact_whatsapp)
    ? `${advertiserCountry.phone_code}${advertiser.contact_whatsapp}`.replace(/\D/g, '')
    : null;

  const locationParts = [
    ad.subregion?.name,
    ad.region?.name,
    ad.country?.name,
  ].filter(Boolean);
  
  const locationString = locationParts.join(', ');

  const allMedia = ad.ad_media || [];
  const coverMedia = allMedia.find(m => m.is_cover) || allMedia[0] || null;
  const otherMedia = allMedia.filter(m => m.id !== coverMedia?.id);

  const hasContactInfo = advertiser.contact_email || fullWhatsappNumber || advertiser.contact_telegram || advertiser.contact_social_url;
  
  const isBoosted = ad.boosted_until && isFuture(new Date(ad.boosted_until));

  const getStatusVariant = (status: AdWithRelations['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'expired':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: AdWithRelations['status']) => {
    const texts = {
        active: 'Activo',
        inactive: 'Inactivo',
        draft: 'Borrador',
        expired: 'Expirado',
    };
    return texts[status] || status;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary">{ad.categories?.name || 'Categoría'}</Badge>
                        {isBoosted && (
                            <Badge className="bg-yellow-400 text-black hover:bg-yellow-500">
                                <Rocket className="mr-1.5 h-3 w-3" />
                                Destacado
                            </Badge>
                        )}
                    </div>
                  <div className="flex items-center gap-4">
                      <Link href={`/perfil/${advertiser.username}`} className="flex items-center gap-2 text-sm text-muted-foreground mb-2 hover:underline">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={advertiser.avatar_url || undefined} alt={advertiser.username} />
                          <AvatarFallback>
                            <UserIcon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span>{advertiser.username}</span>
                      </Link>
                      {ratingCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="font-bold">{averageRating.toFixed(1)}</span>
                            <span>({ratingCount})</span>
                        </div>
                      )}
                  </div>
                  <CardTitle className="text-3xl font-bold">{ad.title}</CardTitle>
                  {ad.tags && ad.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {ad.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-sm">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {locationString && (
                    <div className="flex items-center text-muted-foreground mt-2">
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{locationString}</span>
                    </div>
                  )}
                </div>
                {currentUser?.id === ad.profiles?.id && (
                  <Badge variant={getStatusVariant(ad.status)} className="capitalize text-base">
                    {getStatusText(ad.status)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Cover Media */}
              {coverMedia ? (
                <div className="relative w-full aspect-square lg:aspect-video rounded-lg overflow-hidden bg-muted mb-6">
                  {coverMedia.type === 'image' ? (
                    <Image
                      src={coverMedia.url}
                      alt={ad.title}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="bg-muted"
                      priority
                    />
                  ) : (
                     <video
                        src={coverMedia.url}
                        controls
                        className="w-full h-full object-contain bg-black"
                      >
                        Tu navegador no soporta el tag de video.
                      </video>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-square lg:aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground mb-6">
                  <span>Sin imagen de portada</span>
                </div>
              )}

              {/* Description */}
              <div className="prose prose-lg max-w-none text-foreground whitespace-pre-wrap mb-8">
                <p>{ad.description}</p>
              </div>

              {/* Other Media Gallery */}
              {otherMedia.length > 0 && (
                <div className="pt-8 border-t">
                  <h3 className="text-2xl font-bold mb-4">Galería</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {otherMedia.map(media => (
                      <div key={media.id} className="relative w-full aspect-square lg:aspect-video rounded-lg overflow-hidden bg-muted">
                        {media.type === 'image' ? (
                          <Image
                            src={media.url}
                            alt={`Imagen de galería para ${ad.title}`}
                            fill
                            style={{ objectFit: 'contain' }}
                            className="bg-muted"
                          />
                        ) : (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-full object-contain bg-black"
                          >
                            Tu navegador no soporta el tag de video.
                          </video>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ratings and Comments */}
              <div className="pt-8 mt-8 border-t">
                 <CommentSection
                    adId={ad.id}
                    adOwnerId={ad.user_id}
                    currentUser={currentUser}
                    initialComments={initialComments}
                    onNewRating={handleNewRating}
                    initialUserRating={initialUserRating}
                  />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Advertiser Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Contactar al Anunciante</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {advertiser.contact_email && (
                  <Button asChild className="w-full" variant="outline">
                    <a href={`mailto:${advertiser.contact_email}`}>
                      <Mail className="mr-2" /> Email
                    </a>
                  </Button>
                )}
                {fullWhatsappNumber && (
                  <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white">
                    <a href={`https://wa.me/${fullWhatsappNumber}`} target="_blank" rel="noopener noreferrer">
                      <Phone className="mr-2" /> WhatsApp
                    </a>
                  </Button>
                )}
                {advertiser.contact_telegram && (
                   <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                    <a href={`https://t.me/${advertiser.contact_telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                      <Send className="mr-2" /> Telegram
                    </a>
                  </Button>
                )}
                {advertiser.contact_social_url && (
                  <Button asChild className="w-full" variant="secondary">
                    <a href={advertiser.contact_social_url} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="mr-2" /> Perfil Social
                    </a>
                  </Button>
                )}
                {!hasContactInfo && (
                    <p className="text-center text-sm text-muted-foreground py-4">El anunciante no ha proporcionado información de contacto.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

       {/* Floating contact bar for mobile */}
       {hasContactInfo && (
         <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-around items-center z-50">
              {advertiser.contact_email && (
                <Button asChild size="icon" variant="outline">
                  <a href={`mailto:${advertiser.contact_email}`} aria-label="Email">
                    <Mail />
                  </a>
                </Button>
              )}
              {fullWhatsappNumber && (
                <Button asChild size="icon" className="bg-green-500 hover:bg-green-600 text-white">
                  <a href={`https://wa.me/${fullWhatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                    <Phone />
                  </a>
                </Button>
              )}
              {advertiser.contact_telegram && (
                 <Button asChild size="icon" className="bg-blue-500 hover:bg-blue-600 text-white">
                  <a href={`https://t.me/${advertiser.contact_telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                    <Send />
                  </a>
                </Button>
              )}
              {advertiser.contact_social_url && (
                <Button asChild size="icon" variant="secondary">
                  <a href={advertiser.contact_social_url} target="_blank" rel="noopener noreferrer" aria-label="Perfil Social">
                    <LinkIcon />
                  </a>
                </Button>
              )}
        </div>
       )}
      
      {/* Similar Ads Section */}
      {similarAds && similarAds.length > 0 && (
        <div className="mt-16">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            También te podría interesar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {similarAds.map((similarAd) => (
              <AdCard key={similarAd.id} ad={similarAd} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
