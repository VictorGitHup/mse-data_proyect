
'use client';

import { useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, ThumbsDown, User as UserIcon } from 'lucide-react';
import { updateCommentStatus } from '@/lib/actions/ratings-comments.actions';
import { useToast } from '@/hooks/use-toast';
import type { AdCommentWithProfile } from '@/lib/types';

interface CommentsModerationProps {
  adId: number;
  initialComments: AdCommentWithProfile[];
}

export default function CommentsModeration({ adId, initialComments }: CommentsModerationProps) {
  const [comments, setComments] = useState(initialComments);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleUpdateStatus = (commentId: number, newStatus: 'approved' | 'rejected') => {
    startTransition(async () => {
      const result = await updateCommentStatus(commentId, adId, newStatus);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: newStatus } : c));
        toast({ title: 'Comentario actualizado', description: `El comentario ha sido ${newStatus === 'approved' ? 'aprobado' : 'rechazado'}.` });
      }
    });
  };
  
  const getStatusVariant = (status: AdCommentWithProfile['status']) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const pendingComments = comments.filter(c => c.status === 'pending');
  const approvedComments = comments.filter(c => c.status === 'approved');
  const rejectedComments = comments.filter(c => c.status === 'rejected');

  const CommentList = ({ title, commentList }: { title: string, commentList: AdCommentWithProfile[] }) => (
    <div className="mt-6">
      <h4 className="font-semibold text-lg">{title} ({commentList.length})</h4>
      <div className="mt-4 space-y-4">
        {commentList.length > 0 ? (
          commentList.map(comment => (
            <div key={comment.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profiles.avatar_url || ''} />
                    <AvatarFallback><UserIcon /></AvatarFallback>
                  </Avatar>
                  <span className="font-semibold">{comment.profiles.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <Badge variant={getStatusVariant(comment.status)}>{comment.status}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">{comment.comment}</p>
              {comment.status === 'pending' && (
                <div className="flex justify-end gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(comment.id, 'rejected')} disabled={isPending}>
                    <ThumbsDown className="mr-2 h-4 w-4" /> Rechazar
                  </Button>
                  <Button size="sm" onClick={() => handleUpdateStatus(comment.id, 'approved')} disabled={isPending}>
                    <Check className="mr-2 h-4 w-4" /> Aprobar
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No hay comentarios en esta categoría.</p>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="text-2xl font-bold">Moderar Comentarios</h3>
      <p className="text-muted-foreground">Aprueba o rechaza los comentarios enviados por los usuarios a tu anuncio.</p>
      
      <CommentList title="Pendientes de Revisión" commentList={pendingComments} />
      <CommentList title="Aprobados" commentList={approvedComments} />
      <CommentList title="Rechazados" commentList={rejectedComments} />
    </div>
  );
}
