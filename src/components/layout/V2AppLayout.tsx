 import { ReactNode } from "react";
 import { Link, useLocation } from "react-router-dom";
 import { 
   Building2, 
   User, 
   Shield,
   LayoutDashboard,
   FileText,
   Users,
   BarChart3,
   Briefcase,
   LogOut,
   Settings,
   ClipboardList,
   FolderOpen
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { useAuthV2 } from "@/hooks/useAuthV2";
 import { Skeleton } from "@/components/ui/skeleton";
 
 interface V2AppLayoutProps {
   children: ReactNode;
   role: "company" | "candidate" | "admin";
 }
 
 const roleConfig = {
   company: {
     title: "Компанія",
     icon: Building2,
     color: "text-primary",
     navItems: [
       { path: "/v2/company", label: "Дашборд", icon: LayoutDashboard },
       { path: "/v2/company/projects", label: "Проєкти найму", icon: Briefcase },
       { path: "/v2/company/cases", label: "Кейси", icon: FileText },
       { path: "/v2/company/candidates", label: "Кандидати", icon: Users },
       { path: "/v2/company/reports", label: "Звіти", icon: BarChart3 },
       { path: "/v2/company/settings", label: "Налаштування", icon: Settings },
     ],
   },
   candidate: {
     title: "Кандидат",
     icon: User,
     color: "text-primary",
     navItems: [
       { path: "/v2/candidate", label: "Дашборд", icon: LayoutDashboard },
       { path: "/v2/candidate/cases", label: "Мої кейси", icon: FileText },
       { path: "/v2/candidate/portfolio", label: "Портфоліо", icon: FolderOpen },
       { path: "/v2/candidate/reports", label: "Результати", icon: ClipboardList },
       { path: "/v2/candidate/profile", label: "Профіль", icon: User },
     ],
   },
   admin: {
     title: "Адміністратор",
     icon: Shield,
     color: "text-destructive",
     navItems: [
       { path: "/v2/admin", label: "Дашборд", icon: LayoutDashboard },
       { path: "/v2/admin/users", label: "Користувачі", icon: Users },
       { path: "/v2/admin/companies", label: "Компанії", icon: Building2 },
       { path: "/v2/admin/cases", label: "Кейси", icon: FileText },
       { path: "/v2/admin/logs", label: "Логи", icon: ClipboardList },
       { path: "/v2/admin/settings", label: "Налаштування", icon: Settings },
     ],
   },
 };
 
 export const V2AppLayout = ({ children, role }: V2AppLayoutProps) => {
   const location = useLocation();
   const { profile, signOut, isLoading } = useAuthV2();
   const config = roleConfig[role];
   const RoleIcon = config.icon;
 
   return (
     <div className="min-h-screen flex bg-background">
       {/* Sidebar */}
       <aside className="w-64 bg-card border-r border-border flex flex-col">
         {/* Logo */}
         <div className="p-6 border-b border-border">
           <Link to="/v2" className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
               <span className="text-primary-foreground font-bold text-sm">M</span>
             </div>
             <div>
               <span className="font-semibold text-foreground">Metaprofile</span>
               <span className="text-xs text-muted-foreground ml-1">v2</span>
             </div>
           </Link>
         </div>
 
         {/* Role indicator */}
         <div className="px-4 py-3 border-b border-border bg-accent/50">
           <div className="flex items-center gap-2 text-sm">
             <RoleIcon className={cn("h-4 w-4", config.color)} />
             <span className="text-muted-foreground">{config.title}</span>
           </div>
         </div>
 
         {/* Navigation */}
         <nav className="flex-1 p-4">
           <ul className="space-y-1">
             {config.navItems.map((item) => {
               const isActive = location.pathname === item.path;
               const Icon = item.icon;
               return (
                 <li key={item.path}>
                   <Link
                     to={item.path}
                     className={cn(
                       "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                       isActive
                         ? "bg-primary text-primary-foreground"
                         : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                     )}
                   >
                     <Icon className="h-4 w-4" />
                     {item.label}
                   </Link>
                 </li>
               );
             })}
           </ul>
         </nav>
 
         {/* User info & logout */}
         <div className="p-4 border-t border-border space-y-3">
           {isLoading ? (
             <div className="flex items-center gap-3 px-3">
               <Skeleton className="h-8 w-8 rounded-full" />
               <Skeleton className="h-4 w-24" />
             </div>
           ) : profile && (
             <div className="flex items-center gap-3 px-3">
               <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                 <User className="h-4 w-4 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium truncate">{profile.full_name || "Користувач"}</p>
                 <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
               </div>
             </div>
           )}
           <button
             onClick={signOut}
             className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
           >
             <LogOut className="h-4 w-4" />
             Вийти
           </button>
         </div>
       </aside>
 
       {/* Main content */}
       <main className="flex-1 overflow-auto">
         {children}
       </main>
     </div>
   );
 };