
'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from 'lucide-react';
import type { AdCommentWithProfile } from '@/lib/types';

interface CommentItemProps {
  comment: AdCommentWithProfile;
}

export default function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className="flex items-start gap-4">
      <Avatar>
        <AvatarImage src={comment.profiles.avatar_url || ''} />
        <AvatarFallback>
            <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{comment.profiles.username}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
        <p className="mt-1 text-foreground">{comment.comment}</p>
      </div>
    </div>
  );
}
