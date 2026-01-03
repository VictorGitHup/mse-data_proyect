
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Mail, Phone, Send, Link as LinkIcon } from "lucide-react";

type Profile = {
  id: string;
  username: string;
  avatar_url: string;
  updated_at: string;
  role: "USER" | "ADVERTISER";
  full_name: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  contact_telegram: string | null;
  contact_social_url: string | null;
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
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<"USER" | "ADVERTISER">("USER");

  // Contact fields
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [contactSocialUrl, setContactSocialUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
      setRole(profile.role || "USER");
      setContactEmail(profile.contact_email || "");
      setContactWhatsapp(profile.contact_whatsapp || "");
      setContactTelegram(profile.contact_telegram || "");
      setContactSocialUrl(profile.contact_social_url || "");
    }
  }, [profile]);

  async function updateProfile({ avatar_url }: { avatar_url?: string } = {}) {
    try {
      setLoading(true);
      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        avatar_url: avatar_url ?? avatarUrl,
        contact_email: contactEmail,
        contact_whatsapp: contactWhatsapp,
        contact_telegram: contactTelegram,
        contact_social_url: contactSocialUrl,
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
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Tu Perfil</CardTitle>
          <CardDescription>Actualiza tu información personal y de contacto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* --- Profile Section --- */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold border-b pb-2">Información Básica</h3>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} alt={username} />
                <AvatarFallback>
                  <UserIcon className="h-12 w-12 text-muted-foreground" />
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
                  <p className="text-xs text-muted-foreground">Sube tu foto de perfil.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ""} disabled />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tu Rol</Label>
              <Input type="text" value={role === 'ADVERTISER' ? 'Anunciante' : 'Usuario'} disabled />
            </div>
          </div>
          
          {/* --- Contact Section (Advertiser only) --- */}
          {role === 'ADVERTISER' && (
            <div className="space-y-6 pt-6 border-t">
              <h3 className="text-lg font-semibold">Información de Contacto Público</h3>
              <p className="text-sm text-muted-foreground">Esta información será visible en tus anuncios para que los usuarios puedan contactarte.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email de Contacto</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="tu@negocio.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactWhatsapp">Número de WhatsApp</Label>
                   <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactWhatsapp"
                      type="text"
                      placeholder="+1234567890"
                      value={contactWhatsapp}
                      onChange={(e) => setContactWhatsapp(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactTelegram">Usuario de Telegram</Label>
                  <div className="relative">
                    <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactTelegram"
                      type="text"
                      placeholder="@tu_usuario_telegram"
                      value={contactTelegram}
                      onChange={(e) => setContactTelegram(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactSocialUrl">URL Red Social</Label>
                   <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contactSocialUrl"
                      type="url"
                      placeholder="https://instagram.com/tu_perfil"
                      value={contactSocialUrl}
                      onChange={(e) => setContactSocialUrl(e.target.value)}
                      disabled={loading}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <Button onClick={() => updateProfile()} disabled={loading} className="w-full">
              {loading ? "Actualizando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    