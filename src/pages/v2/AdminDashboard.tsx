 import { V2AppLayout } from "@/components/layout/V2AppLayout";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Users, Building2, FileText, Shield } from "lucide-react";
 import { useAuthV2 } from "@/hooks/useAuthV2";
 
 const AdminDashboard = () => {
   const { profile } = useAuthV2();
 
   return (
     <V2AppLayout role="admin">
       <div className="p-6 lg:p-8">
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-2xl font-semibold text-foreground">
             Адмін-панель
           </h1>
           <p className="text-muted-foreground mt-1">
             Управління платформою Metaprofile v2
           </p>
         </div>
 
         {/* Stats */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Всього користувачів</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Зареєстровано на платформі</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Компанії</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Активні акаунти</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Кандидати</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Зареєстровані кандидати</p>
             </CardContent>
           </Card>
           <Card>
             <CardHeader className="pb-2">
               <CardDescription>Кейси</CardDescription>
               <CardTitle className="text-3xl">0</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-xs text-muted-foreground">Всього в системі</p>
             </CardContent>
           </Card>
         </div>
 
         {/* Admin sections */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Users className="h-5 w-5" />
                 Управління користувачами
               </CardTitle>
               <CardDescription>
                 Перегляд та редагування користувачів платформи
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-center py-8 text-muted-foreground">
                 <p>Функція в розробці</p>
               </div>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Building2 className="h-5 w-5" />
                 Компанії
               </CardTitle>
               <CardDescription>
                 Моніторинг активності компаній
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-center py-8 text-muted-foreground">
                 <p>Функція в розробці</p>
               </div>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <FileText className="h-5 w-5" />
                 Системні кейси
               </CardTitle>
               <CardDescription>
                 Управління шаблонами кейсів
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-center py-8 text-muted-foreground">
                 <p>Функція в розробці</p>
               </div>
             </CardContent>
           </Card>
 
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Shield className="h-5 w-5" />
                 Безпека
               </CardTitle>
               <CardDescription>
                 Логи доступу та безпеки
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="text-center py-8 text-muted-foreground">
                 <p>Функція в розробці</p>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* Admin Notice */}
         <div className="mt-8 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
           <p className="text-sm text-foreground">
             <strong>⚠️ Адміністратор:</strong> Ви маєте повний доступ до системи. 
             Будь-які зміни логуються.
           </p>
         </div>
       </div>
     </V2AppLayout>
   );
 };
 
 export default AdminDashboard;