'use client';

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AdForCard } from "@/lib/types";
import { MapPin, Star, Rocket } from "lucide-react";
import { isFuture, parseISO } from "date-fns";

interface AdCardProps {
  ad: AdForCard;
}

export default function AdCard({ ad }: AdCardProps) {
  // Ensure we have a cover image URL
  const coverImageUrl = ad.ad_media && ad.ad_media.length > 0 ? ad.ad_media[0].url : '/placeholder.png';
  const isBoosted = ad.boosted_until && isFuture(parseISO(ad.boosted_until));

  return (
    <Link href={`/ad/${ad.slug}`} className="group block">
      <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.02]">
        <CardHeader className="p-0">
          <div className="relative w-full aspect-square overflow-hidden">
            <Image
              src={coverImageUrl}
              alt={ad.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
             {isBoosted && (
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-yellow-400/90 px-2 py-1 text-xs font-bold text-black">
                <Rocket className="h-3 w-3" />
                <span>Destacado</span>
              </div>
            )}
            {ad.rating_count && ad.rating_count > 0 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-bold text-white">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{ad.avg_rating?.toFixed(1)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 space-y-1 sm:space-y-2">
          {ad.category?.name && (
             <Badge variant="secondary" className="text-[10px] sm:text-xs">{ad.category.name}</Badge>
          )}
          <h3 className="font-semibold text-sm sm:text-lg leading-tight truncate">{ad.title}</h3>
          {ad.country?.name && (
            <div className="flex items-center text-xs text-muted-foreground">
              <MapPin className="mr-1 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{ad.country.name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
