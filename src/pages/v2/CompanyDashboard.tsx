 import { V2AppLayout } from "@/components/layout/V2AppLayout";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Plus, Users, FileText, BarChart3, Clock } from "lucide-react";
 import { Link } from "react-router-dom";
 import { useAuthV2 } from "@/hooks/useAuthV2";
 
 const CompanyDashboard = () => {
   const { profile } = useAuthV2();
 
   return (
     <V2AppLayout role="company">
       <div className="p-6 lg:p-8">
         {/* Header */}
         <div className="flex items-center justify-between mb-8">
           <div>
             <h1 className="text-2xl font-semibold text-foreground">
               Вітаємо, {profile?.full_name || "Компанія"}!
             </h1>
             <p className="text-muted-foreground mt-1">
               Панель управління наймом
             </p>
           </div>
           <div className="flex gap-3">
             <Button asChild>
               <Link to="/v2/company/projects/create">
                 <Plus className="h-4 w-4 mr-2" />
                 Новий проєкт найму
               </Link>
             </Button>
           </div>
         </div>
 
         {/* Stats */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Активні проєкти</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Проєкти найму в роботі</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Кандидати</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Всього запрошено</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Кейси виконано</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Очікують оцінки</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Decision Packs</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Готові звіти</p>
             </CardContent>
           </Card>
         </div>
 
         {/* Quick actions */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FileText className="h-5 w-5" />
                 Проєкти найму
               </CardTitle>
               <CardDescription>
                 Створюйте проєкти для оцінки кандидатів на конкретні позиції
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-center py-8 text-muted-foreground">
                 <p>У вас поки немає проєктів найму</p>
                 <Button variant="outline" className="mt-4" asChild>
                   <Link to="/v2/company/projects/create">
                     Створити перший проєкт
                   </Link>
                 </Button>
               </div>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Users className="h-5 w-5" />
                 Останні кандидати
               </CardTitle>
               <CardDescription>
                 Кандидати, які виконали кейси
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-center py-8 text-muted-foreground">
                 <p>Немає кандидатів для перегляду</p>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* AI Disclaimer */}
         <div className="mt-8 p-4 bg-accent/50 rounded-lg border border-border">
           <p className="text-sm text-muted-foreground">
             <strong>AI-підтримка:</strong> Рекомендації на платформі є дорадчими. 
             Фінальне рішення про найм залишається за компанією.
           </p>
         </div>
       </div>
     </V2AppLayout>
   );
 };
 
 export default CompanyDashboard;