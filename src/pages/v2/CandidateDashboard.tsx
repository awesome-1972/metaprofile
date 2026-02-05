 import { V2AppLayout } from "@/components/layout/V2AppLayout";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { FileText, ClipboardList, FolderOpen, User } from "lucide-react";
 import { Link } from "react-router-dom";
 import { useAuthV2 } from "@/hooks/useAuthV2";
 
 const CandidateDashboard = () => {
   const { profile } = useAuthV2();
 
   return (
     <V2AppLayout role="candidate">
       <div className="p-6 lg:p-8">
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-2xl font-semibold text-foreground">
             Вітаємо, {profile?.full_name || "Кандидат"}!
           </h1>
           <p className="text-muted-foreground mt-1">
             Ваш особистий кабінет кандидата
           </p>
         </div>
 
         {/* Stats */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Призначені кейси</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Очікують виконання</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Виконано</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Всього кейсів</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Звіти</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Готові результати</p>
             </CardContent>
           </Card>
         </div>
 
         {/* Main sections */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FileText className="h-5 w-5" />
                 Активні кейси
               </CardTitle>
               <CardDescription>
                 Кейси, призначені вам для виконання
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-center py-8 text-muted-foreground">
                 <p>Вам поки не призначено жодного кейсу</p>
                 <p className="text-sm mt-2">
                   Коли компанія запросить вас на оцінку, кейс з'явиться тут
                 </p>
               </div>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FolderOpen className="h-5 w-5" />
                 Моє портфоліо
               </CardTitle>
               <CardDescription>
                 Історія виконаних кейсів та ваші досягнення
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-center py-8 text-muted-foreground">
                 <p>Портфоліо поки порожнє</p>
                 <Button variant="outline" className="mt-4" asChild>
                   <Link to="/v2/candidate/profile">
                     Заповнити профіль
                   </Link>
                 </Button>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* Profile completion prompt */}
         <Card className="mt-6">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <User className="h-5 w-5" />
               Заповніть свій профіль
             </CardTitle>
             <CardDescription>
               Повний профіль підвищує ваші шанси на успішну оцінку
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <p className="text-sm">Профіль заповнено на 20%</p>
                 <div className="w-48 h-2 bg-accent rounded-full overflow-hidden">
                   <div className="h-full w-1/5 bg-primary rounded-full" />
                 </div>
               </div>
               <Button variant="outline" asChild>
                 <Link to="/v2/candidate/profile">Редагувати</Link>
               </Button>
             </div>
           </CardContent>
         </Card>
 
         {/* AI Disclaimer */}
         <div className="mt-8 p-4 bg-accent/50 rounded-lg border border-border">
           <p className="text-sm text-muted-foreground">
             <strong>AI-аналітика:</strong> Платформа використовує AI для аналізу відповідей. 
             Рівень AI-втручання відображається у звітах.
           </p>
         </div>
       </div>
     </V2AppLayout>
   );
 };
 
 export default CandidateDashboard;