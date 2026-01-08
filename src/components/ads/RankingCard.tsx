'use client';

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AdForCard } from "@/lib/types";
import { MapPin, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankingCardProps {
  ad: AdForCard;
  rank: number;
  podiumColor: string;
}

export default function RankingCard({ ad, rank, podiumColor }: RankingCardProps) {
  const coverImageUrl = ad.ad_media && ad.ad_media.length > 0 ? ad.ad_media[0].url : '/placeholder.png';

  return (
    <Link href={`/ad/${ad.slug}`} className="group block">
      <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:scale-[1.03] h-full flex flex-col">
        <CardHeader className="p-0">
          <div className="relative w-full aspect-[4/3] overflow-hidden">
            <Image
              src={coverImageUrl}
              alt={ad.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className={cn("absolute top-3 left-3 flex items-center justify-center h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border-2", podiumColor.replace('text-', 'border-'))}>
              <Trophy className={cn("h-7 w-7", podiumColor)} />
              <span className="absolute text-xs font-bold -bottom-1 -right-1 bg-background rounded-full px-1">{rank}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col justify-between">
            <div>
                <h3 className="font-bold text-xl leading-tight truncate mb-2">{ad.title}</h3>
                {ad.country?.name && (
                    <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-1.5 h-4 w-4 shrink-0" />
                    <span className="truncate">{ad.country.name}</span>
                    </div>
                )}
            </div>
          
            {ad.rating_count && ad.rating_count > 0 && (
            <div className="flex items-center gap-2 text-lg font-bold text-yellow-500 mt-4">
                <Star className="h-5 w-5 fill-current" />
                <span>{ad.avg_rating?.toFixed(1)}</span>
                <span className="text-sm font-normal text-muted-foreground">({ad.rating_count} {ad.rating_count > 1 ? 'votos' : 'voto'})</span>
            </div>
            )}
        </CardContent>
      </Card>
    </Link>
  );
}
