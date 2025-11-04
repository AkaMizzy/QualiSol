import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import api, { setAuthToken } from '../services/api';

// Types
interface User {
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  completePostLoginLoading: () => void;
}

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
};

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
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (token && userData) {
        setAuthToken(token); // Set token for API calls
        const user = JSON.parse(userData);
        // For now, we'll trust the stored data
        // In production, you might want to validate the token with the backend
        setAuthState({
          user: { ...user, id: String(user.id) },
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

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await api.post('/auth/login', { email, password });
      const data = response.data;

      if (response.status === 200) {
        // Check if user is of type 'user' (only user type can access mobile app)
        if (data.role === 'user' || data.role === 'admin') {
          // Store auth data
          await Promise.all([
            AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token),
            AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data)),
          ]);

          setAuthToken(data.token); // Set token for API calls

          setAuthState({
            user: { ...data, id: String(data.id) },
            token: data.token,
            isLoading: false,
            isAuthenticated: true,
            isPostLoginLoading: true,
          });

          console.log('Auth state updated successfully:', {
            user: data,
            token: data.token,
            isAuthenticated: true,
          });

          return { success: true };
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return { 
            success: false, 
            error: 'This app is only for regular users. Please use the web application for administrative access.' 
          };
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: data.error || 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('AuthContext: Starting logout process...');
      await clearStorage();
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

  const updateUser = (userData: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...userData };
      setAuthState(prev => ({ ...prev, user: updatedUser }));
      // Update storage
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  };

  const completePostLoginLoading = () => {
    setAuthState(prev => ({ ...prev, isPostLoginLoading: false }));
  };

  const clearStorage = async () => {
    try {
      console.log('AuthContext: Clearing storage...');
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);
      console.log('AuthContext: Storage cleared successfully');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
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
