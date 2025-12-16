"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  updated_at: string;
} | null;

export default function AccountPage() {
  const { session, user, supabase } = useApp();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!session) {
      router.push("/login");
    } else {
      getProfile();
    }
  }, [session, router]);

  async function getProfile() {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error, status } = await supabase
        .from("profiles")
        .select(`*`)
        .eq("id", user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setProfile(data);
        setUsername(data.username);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error: any) {
      toast({
        title: "Error cargando perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    if (!user) return;
    try {
      setLoading(true);
      const updates = {
        id: user.id,
        username,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) {
        throw error;
      }
      toast({
        title: "¡Éxito!",
        description: "Tu perfil ha sido actualizado.",
      });
      getProfile(); // Refresh profile data
    } catch (error: any) {
      toast({
        title: "Error actualizando perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!session || !user) {
    return null; // Or a loading spinner
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Tu Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email} disabled />
          </div>
          <div>
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input
              id="username"
              type="text"
              value={username || ""}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="avatar">URL del Avatar</Label>
            <Input
              id="avatar"
              type="text"
              value={avatarUrl || ""}
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Button onClick={updateProfile} disabled={loading} className="w-full">
              {loading ? "Actualizando..." : "Actualizar Perfil"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
