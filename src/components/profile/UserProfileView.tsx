
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AdCard from "@/components/ads/AdCard";
import { Mail, Phone, Send, Link as LinkIcon, User as UserIcon, Award, Briefcase } from "lucide-react";
import type { AdForCard, Profile, Location } from "@/lib/types";
import { Badge } from "../ui/badge";

type ProfileWithCountry = Profile & {
    country: Pick<Location, 'name' | 'phone_code'> | null;
}

interface UserProfileViewProps {
  profile: ProfileWithCountry;
  ads: AdForCard[];
}

export default function UserProfileView({ profile, ads }: UserProfileViewProps) {

  const fullWhatsappNumber = (profile.country?.phone_code && profile.contact_whatsapp)
    ? `${profile.country.phone_code}${profile.contact_whatsapp}`.replace(/\D/g, '')
    : null;

  const hasContactInfo = profile.contact_email || fullWhatsappNumber || profile.contact_telegram || profile.contact_social_url;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex flex-col items-center text-center gap-4">
        <Avatar className="h-32 w-32 border-4 border-primary">
          <AvatarImage src={profile.avatar_url || ''} alt={profile.username} />
          <AvatarFallback>
            <UserIcon className="h-16 w-16 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div>
            <h1 className="text-4xl font-bold tracking-tighter">{profile.username}</h1>
            {profile.full_name && <p className="text-xl text-muted-foreground">{profile.full_name}</p>}
            <Badge variant="outline" className="mt-2 text-sm">
                {profile.role === 'ADVERTISER' ? <Briefcase className="mr-2 h-4 w-4" /> : <Award className="mr-2 h-4 w-4" />}
                {profile.role === 'ADVERTISER' ? 'Anunciante' : 'Usuario'}
            </Badge>
        </div>

        {profile.role === 'ADVERTISER' && hasContactInfo && (
            <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
                {profile.contact_email && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${profile.contact_email}`}>
                      <Mail className="mr-2" /> Email
                    </a>
                  </Button>
                )}
                {fullWhatsappNumber && (
                  <Button asChild size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                    <a href={`https://wa.me/${fullWhatsappNumber}`} target="_blank" rel="noopener noreferrer">
                      <Phone className="mr-2" /> WhatsApp
                    </a>
                  </Button>
                )}
                {profile.contact_telegram && (
                   <Button asChild size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                    <a href={`https://t.me/${profile.contact_telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                      <Send className="mr-2" /> Telegram
                    </a>
                  </Button>
                )}
                {profile.contact_social_url && (
                  <Button asChild size="sm" variant="secondary">
                    <a href={profile.contact_social_url} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="mr-2" /> Perfil Social
                    </a>
                  </Button>
                )}
            </div>
        )}
      </header>

      <main>
        <h2 className="text-3xl font-bold tracking-tight mb-6 text-center md:text-left">
          Anuncios de {profile.username}
        </h2>
        
        {ads.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        ) : (
          <div className="text-center p-16 border-2 border-dashed rounded-lg mt-8">
            <h3 className="text-2xl font-semibold">No se encontraron anuncios</h3>
            <p className="text-muted-foreground mt-2">
              Este usuario no tiene ningún anuncio activo en este momento.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
