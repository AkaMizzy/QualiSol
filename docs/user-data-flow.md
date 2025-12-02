### User Data Handling and Access

This document outlines how user data, including `firstname` and `lastname`, is managed and accessed throughout the application.

---

### 1. Authentication and Data Storage

1.  **Login:** When a user logs in successfully via the `login` function in `authService.ts`, the backend returns a response containing a `token` and a nested `user` object.

2.  **Secure Storage:** The `authService.ts` immediately saves the complete `user` object to the device's secure storage by calling `saveUser(data.user)`. This ensures all user details received from the server are persisted securely.

3.  **Context Initialization:** On application startup, the `AuthProvider` in `AuthContext.tsx` reads the token and the user object from secure storage. It then populates the global authentication state with this data.

A failsafe is included in `AuthContext.tsx` to handle any legacy, improperly structured user data, ensuring the app remains stable.

---

### 2. User Object Structure

The user object available throughout the app conforms to the `User` interface defined in `AuthContext.tsx`:

```typescript
export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  company_id: string | null;
  photo?: string | null;
}
```

---

### 3. Accessing User Data in Components

To access the currently logged-in user's data within any functional component, use the `useAuth` hook.

-   Import the hook: `import { useAuth } from '@/contexts/AuthContext';`
-   Call the hook inside your component: `const { user } = useAuth();`

The `user` object will contain all the properties defined in the `User` interface, provided the user is authenticated. It will be `null` if no user is logged in.

---

### 4. Example Usage

Here is a simple example of how to display the user's full name in a component:

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

function UserProfile() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Text>Please log in.</Text>;
  }

  return (
    <View>
      <Text>Welcome, {user.firstname} {user.lastname}!</Text>
      <Text>Email: {user.email}</Text>
    </View>
  );
}

export default UserProfile;
```
