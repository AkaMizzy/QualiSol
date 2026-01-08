import { useAuth } from '@/contexts/AuthContext';
import { router, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import ConstructionLoadingScreen from './ConstructionLoadingScreen';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, isPostLoginLoading, completePostLoginLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is loaded

    // Don't perform navigation actions while the post-login loading screen is active.
    if (isPostLoginLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // If the user is authenticated and is in the auth group (e.g., login page),
      // redirect them to the main app. Platform-specific: web goes to webhome, mobile to tabs.
      if (require('react-native').Platform.OS === 'web') {
        router.replace('/webhome');
      } else {
        router.replace('/(tabs)');
      }
    } else if (!isAuthenticated && !inAuthGroup) {
      // If the user is not authenticated and is not in the auth group,
      // redirect them to the login page.
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, isPostLoginLoading, segments]);

  if (isLoading) {
    // This is for the initial app load, checking for a stored token.
    return <ConstructionLoadingScreen onLoadingComplete={() => {}} />;
  }
  
  // After a successful login, show the loading screen before navigating.
  if (isAuthenticated && isPostLoginLoading) {
    return <ConstructionLoadingScreen onLoadingComplete={completePostLoginLoading} />;
  }

  return <>{children}</>;
}
