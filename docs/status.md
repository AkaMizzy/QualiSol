## Project State Summary (Auth & Session Persistence)

### What Was Implemented
- Session token persistence using expo-secure-store per docs/token-flow.md.
- Auto-login on app start by restoring the saved session token and applying the default Authorization header.
- Centralized route protection via AuthWrapper to redirect based on authentication state.
- Post-login loading UI restored via isPostLoginLoading in AuthContext and handled in AuthWrapper.
- Profile photo upload now includes Authorization header.

### Files Updated
- contexts/AuthContext.tsx
  - Switched from AsyncStorage to services/secureStore for token/user.
  - Exposed setLoginData, logout, updateUser, completePostLoginLoading.
  - Restored isPostLoginLoading to control post-login loading screen.
  - Applies axios default Authorization header via setAuthToken on init and login.

- components/AuthWrapper.tsx
  - Added route guard logic using useSegments.
  - Shows ConstructionLoadingScreen during initial auth load and post-login phase.
  - Defers navigation while isPostLoginLoading is true.

- app/(auth)/login.tsx
  - Uses services/authService.login for API.
  - Calls useAuth().setLoginData on success.
  - Removed obsolete isPostLoginLoading UI branch.

- services/authService.ts
  - Saves AUTH token and user via services/secureStore on successful login.
  - Clears HEALTH token, sets axios Authorization header.
  - Handles health-token fallback headers per docs/token-flow.md.

- app/(tabs)/profile.tsx
  - Uses token from AuthContext; added Authorization header for photo upload.
  - Logout calls useAuth().logout; navigation handled centrally.

### What Did Not Work / Issues Fixed
- ConstructionLoadingScreen did not display after centralizing routing in AuthWrapper.
  - Fix: Reintroduced isPostLoginLoading in AuthContext and updated AuthWrapper to display the screen and then call completePostLoginLoading.

- Build error: "Cannot find name 'isPostLoginLoading'" in app/(auth)/login.tsx.
  - Fix: Removed the obsolete conditional render; loading is now handled in AuthWrapper.

### Current Behavior (Facts)
- On successful login, the API response token is saved to SecureStore as AUTH_TOKEN, HEALTH_TOKEN is cleared, axios default Authorization header is set, and isPostLoginLoading is set to true; AuthWrapper shows ConstructionLoadingScreen and then navigates to /(tabs).
- On app launch, if a stored AUTH token exists, it is restored and applied; user is considered authenticated and routed to /(tabs).
- On logout, AUTH token and user are cleared from SecureStore; axios default Authorization header is removed; user is routed to /(auth)/login by AuthWrapper.

### References
- docs/token-flow.md
- services/secureStore.ts
- services/authService.ts

