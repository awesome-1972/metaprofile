import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DemoRegistrationPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Заповніть обов'язкові поля (ім'я та email)");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Введіть коректний email");
      return;
    }

    setIsLoading(true);

    try {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { error } = await supabase.from("demo_registrations").insert({
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        company: company.trim() || null,
        phone: phone.trim() || null,
      });

      if (error) {
        throw error;
      }

      toast.success("Thank you! Your registration has been received.");
      setName("");
      setEmail("");
      setCompany("");
      setPhone("");

      localStorage.setItem("demo_registered", "true");
      navigate("/");
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">M</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Демо-реєстрація</CardTitle>
          <CardDescription>
            Зареєструйтесь для доступу до демо-версії платформи Metaprofile
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ім'я та прізвище *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Іван Петренко"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Компанія</Label>
              <Input
                id="company"
                type="text"
                placeholder="Назва компанії"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={isLoading}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+380..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                maxLength={20}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Відправка..." : "Зареєструватися для демо"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoRegistrationPage;
