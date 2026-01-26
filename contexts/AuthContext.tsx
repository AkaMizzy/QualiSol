import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { setAuthToken, setOnUnauthorized } from "../services/api";
import {
  clearAuthToken,
  clearUser,
  getAuthToken,
  getUser,
  saveAuthToken,
  saveUser,
} from "../services/secureStore";

// Types
export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  company_id: string | null;
  identifier: string;
  photo?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPostLoginLoading: boolean;
}

interface AuthContextType extends AuthState {
  setLoginData: (data: { token: string; user: User }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  completePostLoginLoading: () => void;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    isPostLoginLoading: false,
  });

  // Initialize auth state from storage
  useEffect(() => {
    initializeAuth();
  }, []);

  // Register auto-logout callback for when token expires (401 errors)
  useEffect(() => {
    setOnUnauthorized(() => {
      console.log("Token expired - auto logout triggered");
      logout();
    });
  }, []);

  const initializeAuth = async () => {
    try {
      const [token, storedUser] = await Promise.all([
        getAuthToken(),
        getUser(),
      ]);

      const user = storedUser && storedUser.user ? storedUser.user : storedUser;

      if (token && user) {
        setAuthToken(token); // Set token for API calls
        // For now, we'll trust the stored data
        // In production, you might want to validate the token with the backend
        setAuthState({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
          isPostLoginLoading: false,
        });
      } else {
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
          isPostLoginLoading: false,
        });
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isPostLoginLoading: false,
      });
    }
  };

  const setLoginData = async (data: { token: string; user: User }) => {
    try {
      const { token, user } = data;
      await saveAuthToken(token);
      await saveUser(user);
      setAuthToken(token);
      setAuthState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
        isPostLoginLoading: true,
      });
    } catch (error) {
      console.error("Failed to set login data:", error);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log("AuthContext: Starting logout process...");
      await clearAuthToken();
      await clearUser();
      setAuthToken(null); // Clear token
      console.log("AuthContext: Storage cleared, updating state...");

      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isPostLoginLoading: false,
      });

      console.log("AuthContext: State updated to logged out");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (authState.user) {
      try {
        // Optimistic update
        const updatedUser = { ...authState.user, ...userData };
        setAuthState((prev) => ({ ...prev, user: updatedUser }));
        await saveUser(updatedUser);

        // Call API to ensure backend is updated
        // Note: We need a service function that calls PUT /api/users/:id
        // Since we don't have direct access to userService here without importing it
        // and potentially creating circular deps, we can use the API instance directly
        // or import the specific function if safe.
        // Let's use the API instance initialized with headers.

        // However, importing userService here is better if possible.
        // Let's try dynamic import or assume the previous context structure meant for this.
        // Actually, checking userService.ts, it has updateUser function.
        // We generally shouldn't mix context state management with direct API calls if not necessary
        // but here the user expects the context function to handle the sync.

        // But wait, the previous code was:
        // const res = await updateUser({ identifier: newIdentifier });
        // The context's updateUser doesn't return a Promise that resolves to response data
        // It's void/Promise<void>.

        // Let's modify this to use userService.
        // Create full payload with required fields from current user state
        const fullPayload = {
          firstname: authState.user.firstname,
          lastname: authState.user.lastname,
          email: authState.user.email,
          identifier: authState.user.identifier,
          ...userData,
        };

        const { updateUser: serviceUpdateUser } =
          await import("../services/userService");
        await serviceUpdateUser(authState.user.id, fullPayload as any);
      } catch (error) {
        console.error("Failed to update user in backend:", error);
        // Ideally revert state here if failed
        throw error; // Let the caller handle the error
      }
    }
  };

  const completePostLoginLoading = () => {
    setAuthState((prev) => ({ ...prev, isPostLoginLoading: false }));
  };

  const value: AuthContextType = {
    ...authState,
    setLoginData,
    logout,
    updateUser,
    completePostLoginLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
