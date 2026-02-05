 import { ReactNode } from "react";
 import { Navigate } from "react-router-dom";
 import { useAuthV2 } from "@/hooks/useAuthV2";
 import { Skeleton } from "@/components/ui/skeleton";
 
 interface ProtectedRouteProps {
   children: ReactNode;
   allowedRoles?: ("admin" | "company" | "candidate")[];
 }
 
 export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
   const { isAuthenticated, isLoading, roles } = useAuthV2();
 
   if (isLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="space-y-4 w-64">
           <Skeleton className="h-12 w-12 rounded-xl mx-auto" />
           <Skeleton className="h-4 w-full" />
           <Skeleton className="h-4 w-3/4 mx-auto" />
         </div>
       </div>
     );
   }
 
   if (!isAuthenticated) {
     return <Navigate to="/v2/auth" replace />;
   }
 
   // Check role access if roles are specified
   if (allowedRoles && allowedRoles.length > 0) {
     const hasAccess = roles.some(role => allowedRoles.includes(role));
     if (!hasAccess) {
       // Redirect to appropriate dashboard based on user's actual role
       if (roles.includes("admin")) {
         return <Navigate to="/v2/admin" replace />;
       } else if (roles.includes("company")) {
         return <Navigate to="/v2/company" replace />;
       } else if (roles.includes("candidate")) {
         return <Navigate to="/v2/candidate" replace />;
       }
       return <Navigate to="/v2/auth" replace />;
     }
   }
 
   return <>{children}</>;
 };