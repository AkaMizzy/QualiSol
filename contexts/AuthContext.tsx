import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { setAuthToken } from '../services/api';
import { clearAuthToken, clearUser, getAuthToken, getUser, saveAuthToken, saveUser } from '../services/secureStore';

// Types
export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  company_id: string | null;
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

  const initializeAuth = async () => {
    try {
      const [token, user] = await Promise.all([
        getAuthToken(),
        getUser(),
      ]);

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
      console.error('Error initializing auth:', error);
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
      console.error('Failed to set login data:', error);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('AuthContext: Starting logout process...');
      await clearAuthToken();
      await clearUser();
      setAuthToken(null); // Clear token
      console.log('AuthContext: Storage cleared, updating state...');
      
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isPostLoginLoading: false,
      });
      
      console.log('AuthContext: State updated to logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      await saveUser(updatedUser);
      setAuthState(prev => ({ ...prev, user: updatedUser }));
    }
  };

  const completePostLoginLoading = () => {
    setAuthState(prev => ({ ...prev, isPostLoginLoading: false }));
  };

  const value: AuthContextType = {
    ...authState,
    setLoginData,
    logout,
    updateUser,
    completePostLoginLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
