import {
  apiGet,
  apiPost,
  clearAccessToken,
  setAccessToken,
  setRefreshToken,
  type AuthUser,
  type LoginResponse,
  type RegisterPayload,
} from "./api";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await apiPost<LoginResponse>("/api/auth/login/", { email, password });
  setAccessToken(data.access);
  setRefreshToken(data.refresh);
  return data;
}

export async function register(payload: RegisterPayload): Promise<LoginResponse> {
  const data = await apiPost<LoginResponse>("/api/auth/register/", payload);
  setAccessToken(data.access);
  setRefreshToken(data.refresh);
  return data;
}

export async function refreshToken(refresh: string): Promise<{ access: string }> {
  const data = await apiPost<{ access: string }>("/api/auth/refresh/", { refresh });
  setAccessToken(data.access);
  return data;
}

export async function getMe(): Promise<AuthUser> {
  return apiGet<AuthUser>("/api/auth/me/");
}

export function logout(): void {
  clearAccessToken();
}
