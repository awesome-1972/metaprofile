 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import type { User, Session } from "@supabase/supabase-js";
 
 type AppRole = "admin" | "company" | "candidate" | "owner" | "recruiter";
 
 interface AuthState {
   user: User | null;
   session: Session | null;
   roles: AppRole[];
   isLoading: boolean;
   profile: {
     id: string;
     email: string;
     full_name: string | null;
     avatar_url: string | null;
   } | null;
 }
 
 export const useAuthV2 = () => {
   const navigate = useNavigate();
   const [state, setState] = useState<AuthState>({
     user: null,
     session: null,
     roles: [],
     isLoading: true,
     profile: null,
   });
 
   useEffect(() => {
     // Set up auth state listener FIRST
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
         setState(prev => ({
           ...prev,
           session,
           user: session?.user ?? null,
         }));
 
         // Defer data fetching with setTimeout to prevent deadlock
         if (session?.user) {
           setTimeout(() => {
             fetchUserData(session.user.id);
           }, 0);
         } else {
           setState(prev => ({
             ...prev,
             roles: [],
             profile: null,
             isLoading: false,
           }));
         }
       }
     );
 
     // THEN check for existing session
     supabase.auth.getSession().then(({ data: { session } }) => {
       setState(prev => ({
         ...prev,
         session,
         user: session?.user ?? null,
       }));
 
       if (session?.user) {
         fetchUserData(session.user.id);
       } else {
         setState(prev => ({ ...prev, isLoading: false }));
       }
     });
 
     return () => subscription.unsubscribe();
   }, []);
 
   const fetchUserData = async (userId: string) => {
     try {
       // Fetch roles
       const { data: rolesData } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", userId);
 
       // Fetch profile
       const { data: profileData } = await supabase
         .from("profiles")
         .select("id, email, full_name, avatar_url")
         .eq("user_id", userId)
         .single();
 
       setState(prev => ({
         ...prev,
         roles: (rolesData?.map(r => r.role) as AppRole[]) || [],
         profile: profileData || null,
         isLoading: false,
       }));
     } catch (error) {
       console.error("Error fetching user data:", error);
       setState(prev => ({ ...prev, isLoading: false }));
     }
   };
 
   const signOut = async () => {
     await supabase.auth.signOut();
     navigate("/v2/auth");
   };
 
   const hasRole = (role: AppRole): boolean => {
     return state.roles.includes(role);
   };
 
   const getPrimaryRole = (): AppRole | null => {
     if (state.roles.includes("admin")) return "admin";
     if (state.roles.includes("owner")) return "owner";
     if (state.roles.includes("recruiter")) return "recruiter";
     if (state.roles.includes("company")) return "company";
     if (state.roles.includes("candidate")) return "candidate";
     return null;
   };
 
   return {
     ...state,
     signOut,
     hasRole,
     getPrimaryRole,
     isAuthenticated: !!state.user,
   };
 };