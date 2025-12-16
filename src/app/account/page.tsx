
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccountForm from "./AccountForm";

export default async function AccountPage() {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`*`)
    .eq("id", user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching profile:", error);
    // Optionally, you can redirect to an error page or show a message
  }

  return <AccountForm user={user} profile={profile} />;
}
