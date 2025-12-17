'use server';

import { z } from 'zod';
import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const adSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
});

export async function createAd(formData: FormData) {
  const supabase = createSupabaseServerActionClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This should be caught by middleware, but as a safeguard.
    redirect('/auth/login');
  }
  
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = adSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    // Handle validation errors, e.g., by returning them to the form.
    console.error(validatedFields.error);
    return; // Or redirect with error message
  }

  const { title, description } = validatedFields.data;

  const { error } = await supabase.from('ads').insert({
    user_id: user.id,
    title,
    description,
    // Add other fields like category, location etc. later
  });

  if (error) {
    console.error('Supabase error:', error);
    // Handle database error
    return;
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
