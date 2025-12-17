
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccountForm from "@/components/auth/AccountForm";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This should be handled by middleware, but as a fallback
    redirect("/auth/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`*`)
    .eq("id", user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching profile:", error);
    // This will be caught by the nearest error.js boundary
    throw new Error("Could not fetch user profile.");
  }

  return <AccountForm user={user} profile={profile} />;
}
