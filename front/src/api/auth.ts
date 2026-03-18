import { fetchJson } from './http';

export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  status: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export async function register(baseUrl: string, email: string, password: string) {
  return await fetchJson<{ id: string; email: string }>(`${baseUrl}/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(baseUrl: string, email: string, password: string) {
  return await fetchJson<LoginResponse>(`${baseUrl}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

