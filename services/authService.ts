import api, { setAuthToken } from './api';
import { getHealthStatus } from './health';
import { clearHealthToken, getHealthToken, saveAuthToken, saveUser } from './secureStore';

export type LoginInput = { identifier: string; password: string };
export type LoginSuccess = { token: string; user: any };
export type LoginResult =
  | { success: true; data: LoginSuccess }
  | { success: false; error: string };

export async function login({ identifier, password }: LoginInput): Promise<LoginResult> {
  async function attemptLogin(tokenForLogin?: string): Promise<LoginResult> {
    try {
      const body: any = { identifier, password };
      if (tokenForLogin) body.token = tokenForLogin;
      // Prefer passing token in Authorization header
      const response = await api.post('/api/users/login', body, tokenForLogin ? {
        headers: { Authorization: `Bearer ${tokenForLogin}` },
      } : undefined);
      const data = response.data;

      if (response.status === 200 && data?.token) {
        const authToken: string = data.token;
        await saveAuthToken(authToken);
        await saveUser(data.user);
        await clearHealthToken();
        setAuthToken(authToken);
        return { success: true, data: { token: authToken, user: data.user } };
      }

      const message = data?.error || 'Authentication failed';
      return { success: false, error: message };
    } catch (err: any) {
      const status = err?.response?.status;
      const tokenMsg = err?.response?.data?.error?.toLowerCase?.() ?? '';
      // If backend indicates missing token in header, retry with x-health-token header
      if (status === 401 && tokenForLogin && (tokenMsg.includes('no token') || tokenMsg.includes('token'))) {
        try {
          const body2: any = { identifier, password, token: tokenForLogin };
          const alt = await api.post('/api/users/login', body2, {
            headers: { 'x-health-token': tokenForLogin },
          });
          const data2 = alt.data;
          if (alt.status === 200 && data2?.token) {
            const authToken: string = data2.token;
            await saveAuthToken(authToken);
            await saveUser(data2.user);
            await clearHealthToken();
            setAuthToken(authToken);
            return { success: true, data: { token: authToken, user: data2.user } };
          }
        } catch {}
      }
      const message = err?.response?.data?.error || 'Network error. Please try again.';
      return { success: false, error: message };
    }
  }

  // First try with stored health token (if present)
  const healthToken = await getHealthToken();
  let first = await attemptLogin(healthToken ?? undefined);

  // If failed due to possibly invalid/missing token, refresh health and retry once
  const msg = !first.success ? first.error?.toLowerCase?.() ?? '' : '';
  const tokenRelated = !first.success && (msg.includes('token') || msg.includes('unauthorized') || msg.includes('invalid'));

  if (!first.success && tokenRelated) {
    await getHealthStatus(); // refresh and store new health token
    const refreshed = await getHealthToken();
    first = await attemptLogin(refreshed ?? undefined);
  }

  return first;
}

export type ForgetPasswordResult = { success: true } | { success: false; error: string };

export async function forgetPassword(email: string): Promise<ForgetPasswordResult> {
  async function attempt(tokenForRequest?: string): Promise<ForgetPasswordResult> {
    try {
      const body: any = { email };
      if (tokenForRequest) body.token = tokenForRequest;
      // Try Authorization header first; some backends require header-based token
      const response = await api.post('/api/users/forgotPassword', body, tokenForRequest ? {
        headers: { Authorization: `Bearer ${tokenForRequest}` },
      } : undefined);
      if (response.status === 200) return { success: true };
      return { success: false, error: "Une erreur s'est produite. Veuillez réessayer." };
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 400) {
        return { success: false, error: '❌ Cet e-mail n’existe pas dans notre base de données.' };
      }
      const tokenMsg = err?.response?.data?.error?.toLowerCase?.() ?? '';
      // If server complains no token provided with Authorization, retry with x-health-token header
      if (status === 401 && tokenForRequest && (tokenMsg.includes('no token') || tokenMsg.includes('token'))) {
        try {
          const alt = await api.post('/api/users/forgotPassword', { email, token: tokenForRequest }, {
            headers: { 'x-health-token': tokenForRequest },
          });
          if (alt.status === 200) return { success: true };
        } catch {}
      }
      const message = err?.response?.data?.error || 'Erreur réseau. Veuillez réessayer.';
      return { success: false, error: message };
    }
  }

  const healthToken = await getHealthToken();
  let res = await attempt(healthToken ?? undefined);
  const maybeTokenMsg = !res.success ? res.error?.toLowerCase?.() ?? '' : '';
  const tokenRelated = !res.success && (maybeTokenMsg.includes('token') || maybeTokenMsg.includes('unauthorized') || maybeTokenMsg.includes('invalid'));
  if (!res.success && tokenRelated) {
    await getHealthStatus();
    const refreshed = await getHealthToken();
    // Retry sequence again with refreshed token (Authorization first, then x-health-token fallback inside attempt)
    res = await attempt(refreshed ?? undefined);
  }
  return res;
}

export async function checkEmailExists(email: string): Promise<{ exists: boolean }> {
  const healthToken = await getHealthToken();
  try {
    const response = await api.post('/api/users/checkEmailExists', { email }, {
      headers: { Authorization: `Bearer ${healthToken}` },
    });
    return response.data;
  } catch {
    // Handle error, maybe return a default value
    return { exists: false };
  }
}

export interface SignupData {
  email: string;
  title: string;
  phone: string;
  pays: string;
  ville: string;
}

export async function signup(data: SignupData): Promise<{ success: boolean; error?: string }> {
  const healthToken = await getHealthToken();
  if (!healthToken) {
    return { success: false, error: "Connexion au serveur impossible. Veuillez réessayer." };
  }

  try {
    await api.post('api/company', data, {
      headers: { Authorization: `Bearer ${healthToken}` },
    });
    return { success: true };
  } catch (err: any) {
    const message = err?.response?.data?.error || "Une erreur est survenue lors de la création du compte.";
    return { success: false, error: message };
  }
}

export type ChangePasswordResult = { success: true } | { success: false; error: string };

export async function changePassword(password: string): Promise<ChangePasswordResult> {
  try {
    const response = await api.post('/api/users/changePassword', { newPassword: password });
    if (response.status === 200) {
      return { success: true };
    }
    return { success: false, error: "Une erreur s'est produite. Veuillez réessayer." };
  } catch (err: any) {
    const message = err?.response?.data?.error || 'Erreur réseau. Veuillez réessayer.';
    return { success: false, error: message };
  }
}