import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import SupabaseProvider from '@/components/providers/supabase-provider';

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/');
  }

  return (
    <SupabaseProvider>
        <LoginForm />
    </SupabaseProvider>
  );
}
