 import { useEffect, useState } from "react";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { toast } from "sonner";
 import { Building2, User, Shield } from "lucide-react";
 
 type RoleType = "company" | "candidate";
 
 const AuthPage = () => {
   const navigate = useNavigate();
   const [isLoading, setIsLoading] = useState(false);
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [fullName, setFullName] = useState("");
   const [companyName, setCompanyName] = useState("");
   const [selectedRole, setSelectedRole] = useState<RoleType>("candidate");
   // Режим встановлення пароля для запрошених (invite) / відновлення (recovery):
   // Supabase шле токен у hash; detectSessionInUrl створює сесію, а тип беремо з hash.
   const [setPasswordMode, setSetPasswordMode] = useState(false);
   const [newPassword, setNewPassword] = useState("");
   const [newPassword2, setNewPassword2] = useState("");

   useEffect(() => {
     const hash = window.location.hash;
     if (/type=(invite|recovery)/.test(hash)) {
       setSetPasswordMode(true);
     } else if (/error_code=otp_expired/.test(hash)) {
       toast.error("Лінк недійсний або протермінований — попросіть надіслати запрошення ще раз");
     } else if (/error=/.test(hash)) {
       toast.error("Помилка авторизації за лінком");
     }
   }, []);

   const redirectByRole = async (userId: string) => {
     const { data: roles } = await supabase
       .from("user_roles")
       .select("role")
       .eq("user_id", userId);
     const all = (roles ?? []).map((r) => r.role as string);
     if (all.some((r) => ["owner", "recruiter", "assistant"].includes(r))) {
       navigate("/ats/clients");
     } else if (all.includes("admin")) {
       navigate("/v2/admin");
     } else if (all.includes("company")) {
       navigate("/v2/company");
     } else {
       navigate("/v2/candidate");
     }
   };

   const handleSetPassword = async (e: React.FormEvent) => {
     e.preventDefault();
     if (newPassword.length < 6) {
       toast.error("Пароль має бути не менше 6 символів");
       return;
     }
     if (newPassword !== newPassword2) {
       toast.error("Паролі не збігаються");
       return;
     }
     setIsLoading(true);
     try {
       const { data, error } = await supabase.auth.updateUser({ password: newPassword });
       if (error) throw error;
       toast.success("Пароль встановлено!");
       if (data.user) await redirectByRole(data.user.id);
     } catch (error: unknown) {
       toast.error((error as Error)?.message || "Не вдалося встановити пароль");
     } finally {
       setIsLoading(false);
     }
   };

   const handleSignUp = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!email || !password || !fullName) {
       toast.error("Заповніть всі обов'язкові поля");
       return;
     }
 
     if (password.length < 6) {
       toast.error("Пароль має бути не менше 6 символів");
       return;
     }
 
     if (selectedRole === "company" && !companyName) {
       toast.error("Вкажіть назву компанії");
       return;
     }
 
     setIsLoading(true);
 
     try {
       const redirectUrl = `${window.location.origin}/v2/auth/callback`;
       
       const { data, error } = await supabase.auth.signUp({
         email,
         password,
         options: {
           emailRedirectTo: redirectUrl,
           data: {
             full_name: fullName,
             role: selectedRole,
             company_name: selectedRole === "company" ? companyName : null,
           },
         },
       });
 
       if (error) throw error;
 
       if (data.user) {
         // Create profile
         const { error: profileError } = await supabase
           .from("profiles")
           .insert({
             user_id: data.user.id,
             email: email,
             full_name: fullName,
           });
 
         if (profileError && !profileError.message.includes("duplicate")) {
           console.error("Profile creation error:", profileError);
         }
 
         // Assign role
         const { error: roleError } = await supabase
           .from("user_roles")
           .insert({
             user_id: data.user.id,
             role: selectedRole,
           });
 
         if (roleError && !roleError.message.includes("duplicate")) {
           console.error("Role assignment error:", roleError);
         }
 
         // Create company if company role
         if (selectedRole === "company" && companyName) {
           const { error: companyError } = await supabase
             .from("companies")
             .insert({
               owner_id: data.user.id,
               name: companyName,
             });
 
           if (companyError) {
             console.error("Company creation error:", companyError);
           }
         }
 
         // Create candidate record if candidate role
         if (selectedRole === "candidate") {
           const { error: candidateError } = await supabase
             .from("candidates")
             .insert({
               user_id: data.user.id,
             });
 
           if (candidateError && !candidateError.message.includes("duplicate")) {
             console.error("Candidate creation error:", candidateError);
           }
         }
 
         toast.success("Реєстрація успішна! Перевірте email для підтвердження.");
       }
     } catch (error) {
       console.error("Sign up error:", error);
       const message = error instanceof Error ? error.message : "";
       if (message.includes("already registered")) {
         toast.error("Цей email вже зареєстрований");
       } else {
         toast.error(message || "Помилка реєстрації");
       }
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleSignIn = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!email || !password) {
       toast.error("Введіть email та пароль");
       return;
     }
 
     setIsLoading(true);
 
     try {
       const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password,
       });
 
       if (error) throw error;
 
       if (data.user) {
         // Get user role and redirect
         const { data: roles } = await supabase
           .from("user_roles")
           .select("role")
           .eq("user_id", data.user.id);
 
         const all = (roles ?? []).map((r) => r.role as string);

         toast.success("Вхід успішний!");

         if (all.some((r) => ["owner", "recruiter", "assistant"].includes(r))) {
           navigate("/ats/clients");
         } else if (all.includes("admin")) {
           navigate("/v2/admin");
         } else if (all.includes("company")) {
           navigate("/v2/company");
         } else {
           navigate("/v2/candidate");
         }
       }
     } catch (error) {
       console.error("Sign in error:", error);
       const message = error instanceof Error ? error.message : "";
       if (message.includes("Invalid login credentials")) {
         toast.error("Невірний email або пароль");
       } else if (message.includes("Email not confirmed")) {
         toast.error("Підтвердіть email перед входом");
       } else {
         toast.error(message || "Помилка входу");
       }
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
           <CardTitle className="text-2xl">Metaprofile v2</CardTitle>
           <CardDescription>
             Платформа для об'єктивного найму на основі практичних кейсів
           </CardDescription>
         </CardHeader>
 
         <CardContent>
           {setPasswordMode ? (
             <form onSubmit={handleSetPassword} className="space-y-4 mt-2">
               <p className="text-sm text-muted-foreground">
                 Вас запрошено до системи. Встановіть пароль для входу.
               </p>
               <div className="space-y-2">
                 <Label htmlFor="new-password">Новий пароль</Label>
                 <Input
                   id="new-password"
                   type="password"
                   value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)}
                   disabled={isLoading}
                   autoFocus
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="new-password2">Повторіть пароль</Label>
                 <Input
                   id="new-password2"
                   type="password"
                   value={newPassword2}
                   onChange={(e) => setNewPassword2(e.target.value)}
                   disabled={isLoading}
                 />
               </div>
               <Button type="submit" className="w-full" disabled={isLoading}>
                 {isLoading ? "Збереження..." : "Встановити пароль і увійти"}
               </Button>
             </form>
           ) : (
           <Tabs defaultValue="signin" className="w-full">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="signin">Вхід</TabsTrigger>
               <TabsTrigger value="signup">Реєстрація</TabsTrigger>
             </TabsList>
 
             <TabsContent value="signin">
               <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                 <div className="space-y-2">
                   <Label htmlFor="signin-email">Email</Label>
                   <Input
                     id="signin-email"
                     type="email"
                     placeholder="email@example.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="signin-password">Пароль</Label>
                   <Input
                     id="signin-password"
                     type="password"
                     placeholder="••••••••"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
 
                 <Button type="submit" className="w-full" disabled={isLoading}>
                   {isLoading ? "Вхід..." : "Увійти"}
                 </Button>
               </form>
             </TabsContent>
 
             <TabsContent value="signup">
               <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                 <div className="space-y-3">
                   <Label>Оберіть роль</Label>
                   <RadioGroup
                     value={selectedRole}
                     onValueChange={(v) => setSelectedRole(v as RoleType)}
                     className="grid grid-cols-2 gap-3"
                   >
                     <div>
                       <RadioGroupItem
                         value="candidate"
                         id="role-candidate"
                         className="peer sr-only"
                       />
                       <Label
                         htmlFor="role-candidate"
                         className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                       >
                         <User className="h-6 w-6 mb-2" />
                         <span className="text-sm font-medium">Кандидат</span>
                       </Label>
                     </div>
                     <div>
                       <RadioGroupItem
                         value="company"
                         id="role-company"
                         className="peer sr-only"
                       />
                       <Label
                         htmlFor="role-company"
                         className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                       >
                         <Building2 className="h-6 w-6 mb-2" />
                         <span className="text-sm font-medium">Компанія</span>
                       </Label>
                     </div>
                   </RadioGroup>
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="signup-name">Повне ім'я *</Label>
                   <Input
                     id="signup-name"
                     type="text"
                     placeholder="Іван Петренко"
                     value={fullName}
                     onChange={(e) => setFullName(e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
 
                 {selectedRole === "company" && (
                   <div className="space-y-2">
                     <Label htmlFor="signup-company">Назва компанії *</Label>
                     <Input
                       id="signup-company"
                       type="text"
                       placeholder="ТОВ Приклад"
                       value={companyName}
                       onChange={(e) => setCompanyName(e.target.value)}
                       disabled={isLoading}
                     />
                   </div>
                 )}
 
                 <div className="space-y-2">
                   <Label htmlFor="signup-email">Email *</Label>
                   <Input
                     id="signup-email"
                     type="email"
                     placeholder="email@example.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
 
                 <div className="space-y-2">
                   <Label htmlFor="signup-password">Пароль *</Label>
                   <Input
                     id="signup-password"
                     type="password"
                     placeholder="Мінімум 6 символів"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     disabled={isLoading}
                   />
                 </div>
 
                 <Button type="submit" className="w-full" disabled={isLoading}>
                   {isLoading ? "Реєстрація..." : "Зареєструватися"}
                 </Button>
 
                 <p className="text-xs text-center text-muted-foreground">
                   Натискаючи "Зареєструватися", ви погоджуєтесь з умовами використання
                 </p>
               </form>
             </TabsContent>
           </Tabs>
           )}
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default AuthPage;