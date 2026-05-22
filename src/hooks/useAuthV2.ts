import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken, type AuthUser } from "@/lib/api";
import { getMe, logout } from "@/lib/authApi";

type AppRole = "admin" | "company" | "candidate";

interface AuthState {
  user: AuthUser | null;
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
    roles: [],
    isLoading: true,
    profile: null,
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    getMe()
      .then(user => {
        setState({
          user,
          roles: [user.role as AppRole],
          isLoading: false,
          profile: {
            id: String(user.id),
            email: user.email,
            full_name: user.full_name,
            avatar_url: null,
          },
        });
      })
      .catch(() => {
        logout();
        setState({ user: null, roles: [], isLoading: false, profile: null });
      });
  }, []);

  const signOut = () => {
    logout();
    navigate("/v2/auth");
  };

  const hasRole = (role: AppRole): boolean => state.roles.includes(role);

  const getPrimaryRole = (): AppRole | null => {
    if (state.roles.includes("admin")) return "admin";
    if (state.roles.includes("company")) return "company";
    if (state.roles.includes("candidate")) return "candidate";
    return null;
  };

  return {
    ...state,
    session: null,
    signOut,
    hasRole,
    getPrimaryRole,
    isAuthenticated: !!state.user,
  };
};
