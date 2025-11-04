### Token Storage and Authentication Flow

This app uses expo-secure-store for all sensitive token storage. We do not use AsyncStorage for tokens.

### Why expo-secure-store (not AsyncStorage)
- **Security**: Data is encrypted and stored in the OS keystore/keychain.
- **Scope**: Protects tokens at rest; mitigates risk from device file access.
- **API**: Simple get/set/delete symmetrical API for secrets.

### Keys
- **HEALTH_TOKEN**: Temporary pre-login token from the ServerHealth check.
- **AUTH_TOKEN**: Persistent session token returned after a successful login.

### Files
- `services/secureStore.ts`: Helpers for saving/reading/clearing tokens.
- `services/health.ts`: Fetches server health and saves `HEALTH_TOKEN` when healthy.
- `services/authService.ts`: Sends `HEALTH_TOKEN` during pre-login requests via headers; on success saves `AUTH_TOKEN`, clears `HEALTH_TOKEN`, and sets default auth header.
- `app/(auth)/login.tsx`: Triggers health check, handles login, wires retry on server-down.

### Endpoints and Shapes
- ServerHealth (GET `/api/health`): `{ status: string, message: string, token: string }`
- Login (POST `/api/users/login`): Body `{ identifier, password, token }`, Success `{ token: string, ...user }`. Token is sent in headers: `Authorization: Bearer <HEALTH_TOKEN>` (fallback `x-health-token`).
- Forgot Password (POST `/api/users/forgotPassword`): Body `{ email, token }`. Token is sent in headers: `Authorization: Bearer <HEALTH_TOKEN>` (fallback `x-health-token`).

### Flow Overview
1) App launch → Server health check
   - Call `getHealthStatus()`.
   - If healthy and response includes `token`, store as `HEALTH_TOKEN` in SecureStore.
   - If unhealthy or on error, clear any stale `HEALTH_TOKEN`.

2) User submits login
   - Read `HEALTH_TOKEN` from SecureStore.
   - Include token in request headers: prefer `Authorization: Bearer <HEALTH_TOKEN>`; fallback to `x-health-token` if required. Also include `token` in the body for compatibility.
   - If backend responds with token-related error (missing/invalid), refresh health (to get a new `HEALTH_TOKEN`) and retry once automatically.

3) On successful login
   - Save returned token as `AUTH_TOKEN` in SecureStore.
   - Clear `HEALTH_TOKEN` from SecureStore.
   - Apply request header via `setAuthToken(token)` (axios default header):
     - Header used: `Authorization: Bearer <token>`.

4) After login (authenticated requests)
   - All axios requests use the default `Authorization` header set during login.
   - If needed at app start, read `AUTH_TOKEN` and call `setAuthToken` to restore the header.

### Error Handling
- Health request failure/timeout: we clear `HEALTH_TOKEN` and mark server down; UI offers a retry (ServerDownModal).
- Login token errors: we perform one safe retry after refreshing health.

### Minimal API Surface
```ts
// services/secureStore.ts
export const HEALTH_TOKEN_KEY = 'HEALTH_TOKEN';
export const AUTH_TOKEN_KEY = 'AUTH_TOKEN';
export async function saveHealthToken(token: string): Promise<void>;
export async function getHealthToken(): Promise<string | null>;
export async function clearHealthToken(): Promise<void>;
export async function saveAuthToken(token: string): Promise<void>;
export async function getAuthToken(): Promise<string | null>;
export async function clearAuthToken(): Promise<void>;
```

```ts
// services/health.ts (essentials)
const res = await fetch('/api/health');
const body = await res.json();
if (ok && body.token) await saveHealthToken(body.token);
else await clearHealthToken();
```

```ts
// services/authService.ts (login essentials)
const ht = await getHealthToken();
const resp = await api.post(
  '/api/users/login',
  { identifier, password, token: ht ?? '' },
  ht ? { headers: { Authorization: `Bearer ${ht}` } } : undefined
);
// optional fallback if middleware expects a different header name
// await api.post('/api/users/login', { identifier, password, token: ht ?? '' }, { headers: { 'x-health-token': ht ?? '' } });
```

```ts
// services/authService.ts (forgot password essentials)
const ht = await getHealthToken();
await api.post(
  '/api/users/forgotPassword',
  { email, token: ht ?? '' },
  ht ? { headers: { Authorization: `Bearer ${ht}` } } : undefined
);
// optional fallback header name
// await api.post('/api/users/forgotPassword', { email, token: ht ?? '' }, { headers: { 'x-health-token': ht ?? '' } });
```


