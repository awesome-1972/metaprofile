// /v2/candidate/profile — багатий профіль кандидата: фото, посада, локація,
// «про себе», досвід, навички, посилання. Зберігається в profiles + Storage(avatars).
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, MapPin, Briefcase, Linkedin, Github, Globe, Camera } from "lucide-react";
import { CandidateAchievements } from "@/components/candidate/CandidateAchievements";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CandidateProfilePage = () => {
  const { profile, user } = useAuthV2();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState({
    full_name: "", headline: "", location: "", phone: "", experience: "",
    about: "", skills: "", linkedin_url: "", github_url: "", portfolio_url: "", avatar_url: "",
  });

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setF({
          full_name: d.full_name || "", headline: d.headline || "", location: d.location || "",
          phone: d.phone || "", experience: d.experience || "", about: d.about || "",
          skills: Array.isArray(d.skills) ? d.skills.join(", ") : "",
          linkedin_url: d.linkedin_url || "", github_url: d.github_url || "", portfolio_url: d.portfolio_url || "",
          avatar_url: d.avatar_url || "",
        });
      });
  }, [user?.id]);

  const initials = (f.full_name || profile?.email || "К").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setF((p) => ({ ...p, avatar_url: url }));
      await supabase.from("profiles").update({ avatar_url: data.publicUrl } as any).eq("user_id", user.id);
      toast.success("Фото оновлено");
    } catch { toast.error("Не вдалось завантажити фото (перевірте, що міграцію застосовано)"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const skills = f.skills.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("profiles").update({
        full_name: f.full_name, headline: f.headline, location: f.location, phone: f.phone,
        experience: f.experience, about: f.about, skills,
        linkedin_url: f.linkedin_url, github_url: f.github_url, portfolio_url: f.portfolio_url,
      } as any).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Профіль збережено");
    } catch { toast.error("Помилка збереження (перевірте, що міграцію застосовано)"); }
    finally { setSaving(false); }
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Профіль</h1>
          <p className="text-muted-foreground mt-1">Ваш публічний профіль — його бачать компанії</p>
        </div>

        {/* Header card: photo + name + headline */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {f.avatar_url ? <AvatarImage src={f.avatar_url} alt={f.full_name} /> : null}
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <Button size="icon" variant="secondary" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                  onClick={() => fileRef.current?.click()} disabled={uploading} title="Змінити фото">
                  <Camera className="h-4 w-4" />
                </Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <p className="text-xl font-semibold">{f.full_name || "Ваше імʼя"}</p>
                <p className="text-muted-foreground">{f.headline || "Посада / спеціалізація"}</p>
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start text-sm text-muted-foreground pt-1">
                  {f.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{f.location}</span>}
                  {f.experience && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{f.experience}</span>}
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{profile?.email || user?.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Основне</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Повне імʼя</Label><Input value={f.full_name} onChange={set("full_name")} placeholder="Імʼя та прізвище" /></div>
                  <div className="space-y-2"><Label>Посада / спеціалізація</Label><Input value={f.headline} onChange={set("headline")} placeholder="Напр. Product Manager" /></div>
                  <div className="space-y-2"><Label>Місто / локація</Label><Input value={f.location} onChange={set("location")} placeholder="Київ, Україна" /></div>
                  <div className="space-y-2"><Label>Досвід</Label><Input value={f.experience} onChange={set("experience")} placeholder="Напр. 5+ років" /></div>
                  <div className="space-y-2"><Label>Телефон</Label><Input value={f.phone} onChange={set("phone")} placeholder="+380..." /></div>
                </div>
                <div className="space-y-2">
                  <Label>Про себе</Label>
                  <Textarea value={f.about} onChange={set("about")} rows={4} placeholder="Розкажіть про себе, свій досвід та сильні сторони..." />
                </div>
                <div className="space-y-2">
                  <Label>Навички (через кому)</Label>
                  <Input value={f.skills} onChange={set("skills")} placeholder="Аналітика, Управління продуктом, SQL..." />
                  {f.skills.trim() && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {f.skills.split(",").map((s) => s.trim()).filter(Boolean).map((s, i) => (
                        <Badge key={i} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Збереження..." : "Зберегти профіль"}</Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Посилання</CardTitle><CardDescription>Профілі та портфоліо</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" />LinkedIn</Label><Input value={f.linkedin_url} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/..." /></div>
                <div className="space-y-2"><Label className="flex items-center gap-2"><Github className="h-4 w-4" />GitHub</Label><Input value={f.github_url} onChange={set("github_url")} placeholder="https://github.com/..." /></div>
                <div className="space-y-2"><Label className="flex items-center gap-2"><Globe className="h-4 w-4" />Портфоліо / сайт</Label><Input value={f.portfolio_url} onChange={set("portfolio_url")} placeholder="https://..." /></div>
                <p className="text-xs text-muted-foreground">Email змінити не можна — це логін акаунта.</p>
              </CardContent>
            </Card>

            <CandidateAchievements userId={user?.id} />
          </div>
        </div>
      </div>
    </V2AppLayout>
  );
};

export default CandidateProfilePage;
