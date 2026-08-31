// /v2/candidate/profile — профіль кандидата (імʼя, телефон; email — з акаунта).
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CandidateProfilePage = () => {
  const { profile, user } = useAuthV2();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) { setFullName(data.full_name || ""); setPhone((data as any).phone || ""); } });
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles")
        .update({ full_name: fullName, phone } as any).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Профіль збережено");
    } catch { toast.error("Помилка збереження"); }
    finally { setSaving(false); }
  };

  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Профіль</h1>
          <p className="text-muted-foreground mt-1">Ваші контактні дані</p>
        </div>
        <div className="max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Особисті дані</CardTitle>
              <CardDescription>Ці дані бачитимуть компанії, що призначають вам кейси</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Повне імʼя</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ваше імʼя та прізвище" />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380..." />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</Label>
                <Input value={profile?.email || user?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">Email змінити не можна — це логін акаунта</p>
              </div>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Збереження..." : "Зберегти"}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </V2AppLayout>
  );
};

export default CandidateProfilePage;
