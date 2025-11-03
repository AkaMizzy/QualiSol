import api from './api';

export type LoginInput = { identifier: string; password: string };
export type LoginSuccess = { token: string; user: any };
export type LoginResult =
  | { success: true; data: LoginSuccess }
  | { success: false; error: string };

export async function login({ identifier, password }: LoginInput): Promise<LoginResult> {
  try {
    const response = await api.post('/api/users/login', { identifier, password });
    const data = response.data;

    if (response.status === 200 && data?.token) {
      return { success: true, data: { token: data.token, user: data } };
    }

    const message = data?.error || 'Authentication failed';
    return { success: false, error: message };
  } catch (err: any) {
    const message = err?.response?.data?.error || 'Network error. Please try again.';
    return { success: false, error: message };
  }
}


