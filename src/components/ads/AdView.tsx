
'use client';

import Image from "next/image";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Send, Link as LinkIcon, User as UserIcon, MapPin } from "lucide-react";
import type { AdWithRelations } from "@/lib/types";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface AdViewProps {
  ad: AdWithRelations;
}

export default function AdView({ ad }: AdViewProps) {
  const advertiser = ad.profiles;

  const locationParts = [
    ad.subregion?.name,
    ad.region?.name,
    ad.country?.name,
  ].filter(Boolean);
  
  const locationString = locationParts.join(', ');

  const sortedMedia = ad.ad_media?.sort((a, b) => (a.is_cover ? -1 : 1)) || [];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="secondary" className="mb-2">{ad.categories?.name || 'Categoría'}</Badge>
                  <CardTitle className="text-3xl font-bold">{ad.title}</CardTitle>
                  {locationString && (
                    <div className="flex items-center text-muted-foreground mt-2">
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{locationString}</span>
                    </div>
                  )}
                </div>
                <Badge variant={ad.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                  {ad.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sortedMedia.length > 0 && (
                <Carousel className="w-full mb-6">
                  <CarouselContent>
                    {sortedMedia.map((media) => (
                      <CarouselItem key={media.id}>
                        <div className="relative w-full h-96 rounded-lg overflow-hidden">
                          <Image
                            src={media.url}
                            alt={ad.title}
                            fill
                            objectFit="cover"
                            className="bg-muted"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </Carousel>
              )}
              <div className="prose prose-lg max-w-none text-foreground">
                <p>{ad.description}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advertiser Info Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={advertiser.avatar_url || undefined} alt={advertiser.username} />
                  <AvatarFallback>
                    <UserIcon className="h-12 w-12 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              <CardTitle>{advertiser.username}</CardTitle>
              <CardDescription>Anunciante</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground text-center">CONTACTAR</h3>
              {advertiser.contact_email && (
                <Button asChild className="w-full" variant="outline">
                  <a href={`mailto:${advertiser.contact_email}`}>
                    <Mail className="mr-2" /> Email
                  </a>
                </Button>
              )}
              {advertiser.contact_whatsapp && (
                <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white">
                  <a href={`https://wa.me/${advertiser.contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
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
              {!advertiser.contact_email && !advertiser.contact_whatsapp && !advertiser.contact_telegram && !advertiser.contact_social_url && (
                  <p className="text-center text-sm text-muted-foreground py-4">El anunciante no ha proporcionado información de contacto.</p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
