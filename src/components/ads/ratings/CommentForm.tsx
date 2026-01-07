
'use client';

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addComment } from "@/lib/actions/ratings-comments.actions";

const commentSchema = z.object({
  comment: z.string().min(10, "El comentario debe tener al menos 10 caracteres.").max(500, "El comentario no puede exceder los 500 caracteres."),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentFormProps {
  adId: number;
  onCommentSubmitted: () => void;
}

export default function CommentForm({ adId, onCommentSubmitted }: CommentFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
  });
  const { toast } = useToast();

  const onSubmit: SubmitHandler<CommentFormValues> = async (data) => {
    const result = await addComment(adId, data.comment);
    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Comentario enviado",
        description: "Tu comentario ha sido enviado y está pendiente de aprobación.",
      });
      reset();
      onCommentSubmitted();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="font-semibold">Deja tu comentario</h3>
      <Textarea
        placeholder="Escribe tu opinión sobre este anuncio..."
        {...register("comment")}
      />
      {errors.comment && <p className="text-sm text-destructive">{errors.comment.message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar Comentario"}
      </Button>
    </form>
  );
}
