
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  async function updateProfile({ avatar_url }: { avatar_url?: string } = {}) {
    try {
      setLoading(true);
      const updates = {
        id: user.id,
        username,
        avatar_url: avatar_url ?? avatarUrl,
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

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setLoading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Debes seleccionar una imagen para subir.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
        
      setAvatarUrl(publicUrl);
      // Now update the profile with the new public URL
      await updateProfile({ avatar_url: publicUrl });

    } catch (error: any) {
      toast({
        title: "Error al subir el avatar",
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
          <div className="flex items-center gap-4">
             <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} alt={username} />
              <AvatarFallback>
                <UserIcon className="h-10 w-10 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <Button asChild variant="outline">
                        <div className="w-full">
                            {loading ? "Subiendo..." : "Cambiar Avatar"}
                        </div>
                    </Button>
                </Label>
                <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={loading}
                    className="hidden"
                />
            </div>
          </div>
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
            <Label>Tu Rol</Label>
            <Input type="text" value={role === 'ADVERTISER' ? 'Anunciante' : 'Usuario'} disabled />
          </div>
          <div>
            <Button onClick={() => updateProfile()} disabled={loading} className="w-full">
              {loading ? "Actualizando..." : "Actualizar Perfil"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
