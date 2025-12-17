import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import SupabaseProvider from '@/components/providers/supabase-provider';
import type { ViewType } from '@supabase/auth-ui-shared';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/');
  }

  const allowedViews: ViewType[] = ['sign_in', 'sign_up'];
  const view = (searchParams.view && allowedViews.includes(searchParams.view as ViewType))
    ? searchParams.view as ViewType
    : 'sign_in';

  return (
    <SupabaseProvider>
        <LoginForm view={view} />
    </SupabaseProvider>
  );
}
