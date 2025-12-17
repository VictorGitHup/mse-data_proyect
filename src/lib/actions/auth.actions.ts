'use server';

import { createSupabaseServerActionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signOut() {
    const supabase = createSupabaseServerActionClient();
    await supabase.auth.signOut();
    redirect('/');
}
