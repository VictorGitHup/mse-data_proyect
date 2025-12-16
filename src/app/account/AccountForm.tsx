
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  updated_at: string;
  role: "USER" | "ADVERTISER";
};

interface AccountFormProps {
  user: User;
  profile: Profile | null;
}

export default function AccountForm({ user, profile }: AccountFormProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<"USER" | "ADVERTISER">("USER");

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url || "");
      setRole(profile.role || "USER");
    } else {
      setUsername("");
      setAvatarUrl("");
      setRole("USER");
    }
  }, [profile]);

  async function updateProfile() {
    try {
      setLoading(true);
      const updates = {
        id: user.id,
        username,
        avatar_url: avatarUrl,
        role,
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
      // Refresh the page to get new server-side props
      router.refresh();
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

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Tu Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">URL del Avatar</Label>
            <Input
              id="avatar"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-3">
            <Label>Tu Rol</Label>
            <RadioGroup
              value={role}
              onValueChange={(value: "USER" | "ADVERTISER") => setRole(value)}
              className="flex items-center gap-6"
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USER" id="role-user" />
                <Label htmlFor="role-user" className="font-normal">
                  Usuario
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ADVERTISER" id="role-advertiser" />
                <Label htmlFor="role-advertiser" className="font-normal">
                  Anunciante
                </Label>
              </div>
            </RadioGroup>
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
