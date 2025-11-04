import * as SecureStore from 'expo-secure-store';

export const HEALTH_TOKEN_KEY = 'HEALTH_TOKEN';
export const AUTH_TOKEN_KEY = 'AUTH_TOKEN';

export async function saveHealthToken(token: string): Promise<void> {
  if (!token) return;
  await SecureStore.setItemAsync(HEALTH_TOKEN_KEY, token, { keychainService: HEALTH_TOKEN_KEY });
}

export async function getHealthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(HEALTH_TOKEN_KEY, { keychainService: HEALTH_TOKEN_KEY });
}

export async function clearHealthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(HEALTH_TOKEN_KEY, { keychainService: HEALTH_TOKEN_KEY });
}

export async function saveAuthToken(token: string): Promise<void> {
  if (!token) return;
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, { keychainService: AUTH_TOKEN_KEY });
}

export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY, { keychainService: AUTH_TOKEN_KEY });
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY, { keychainService: AUTH_TOKEN_KEY });
}


