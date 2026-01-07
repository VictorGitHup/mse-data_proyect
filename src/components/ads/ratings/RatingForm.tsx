
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addRating } from "@/lib/actions/ratings-comments.actions";
import { cn } from '@/lib/utils';

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
});

type RatingFormValues = z.infer<typeof ratingSchema>;

interface RatingFormProps {
  adId: number;
  onNewRating: (newAverage: number, newCount: number) => void;
  initialRating: number;
}

export default function RatingForm({ adId, onNewRating, initialRating }: RatingFormProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(initialRating);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRatingSubmit = async () => {
    if (currentRating === 0) {
      toast({ title: 'Error', description: 'Por favor, selecciona una calificación.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    const result = await addRating(adId, currentRating);
    setIsSubmitting(false);

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Calificación enviada", description: "¡Gracias por tu opinión!" });
      if (result.averageRating !== undefined && result.ratingCount !== undefined) {
        onNewRating(result.averageRating, result.ratingCount);
      }
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">
        {initialRating > 0 ? "Actualiza tu calificación" : "Califica este anuncio"}
      </h3>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-7 w-7 cursor-pointer transition-colors",
              (hoverRating >= star || currentRating >= star) 
                ? "text-yellow-400 fill-yellow-400" 
                : "text-muted-foreground"
            )}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setCurrentRating(star)}
          />
        ))}
      </div>
      <Button onClick={handleRatingSubmit} disabled={isSubmitting || currentRating === 0} size="sm">
        {isSubmitting ? 'Enviando...' : 'Enviar Calificación'}
      </Button>
    </div>
  );
}
