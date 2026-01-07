
'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';
import RatingForm from './RatingForm';
import { getComments } from '@/lib/actions/ratings-comments.actions';
import type { User } from "@supabase/supabase-js";
import type { AdCommentWithProfile } from '@/lib/types';

interface CommentSectionProps {
  adId: number;
  adOwnerId: string;
  currentUser: User | null;
  initialComments: AdCommentWithProfile[];
  onNewRating: (newAverage: number, newCount: number) => void;
}

export default function CommentSection({ 
    adId, 
    adOwnerId, 
    currentUser, 
    initialComments,
    onNewRating,
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOwner = currentUser?.id === adOwnerId;

  const refreshComments = () => {
    startTransition(async () => {
      // Re-fetch only 'approved' comments to show the user
      const { data } = await getComments(adId);
      if (data) {
        setComments(data as AdCommentWithProfile[]);
      }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">Calificaciones y Comentarios</h3>
      
      {/* Show rating/comment form if user is logged in AND is not the owner */}
      {!isOwner && currentUser && (
        <div className="p-4 border rounded-lg bg-card space-y-4">
          <RatingForm adId={adId} onNewRating={onNewRating} />
          <CommentForm adId={adId} onCommentSubmitted={() => setShowForm(false)} />
        </div>
      )}

      {/* Show login prompt if user is not logged in */}
      {!currentUser && (
        <div className="text-center p-6 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            <a href="/auth/login" className="text-primary font-semibold hover:underline">Inicia sesión</a> para dejar una calificación o comentario.
          </p>
        </div>
      )}

      {/* Display comments */}
      <div className="space-y-6">
        {isPending ? (
          <p>Cargando comentarios...</p>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <p className="text-muted-foreground">Este anuncio todavía no tiene comentarios.</p>
        )}
      </div>
    </div>
  );
}
