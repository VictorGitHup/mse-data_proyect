'use client';

import { useSupabase } from '@/components/providers/supabase-provider';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function LoginForm() {
    const { supabase } = useSupabase();

    return (
        <div className="flex justify-center items-center h-[calc(100vh-80px)] p-4">
            <div className="w-full max-w-md p-8 rounded-lg shadow-md bg-card">
                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    theme="dark"
                    showLinks={false}
                    providers={[]}
                    redirectTo={`${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`}
                />
            </div>
        </div>
    );
}
