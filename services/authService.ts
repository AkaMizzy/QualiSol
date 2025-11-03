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

export type ForgetPasswordResult = { success: true } | { success: false; error: string };

export async function forgetPassword(email: string): Promise<ForgetPasswordResult> {
  try {
    const response = await api.post('/api/users/forgotPassword', { email });
    if (response.status === 200) return { success: true };
    // Unexpected non-200
    return {
      success: false,
      error: "Une erreur s'est produite. Veuillez réessayer.",
    };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404 || status === 400) {
      return { success: false, error: '❌ Cet e-mail n’existe pas dans notre base de données.' };
    }
    const message = err?.response?.data?.error || 'Erreur réseau. Veuillez réessayer.';
    return { success: false, error: message };
  }
}
