import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import React from 'react';
import ConstructionLoadingScreen from './ConstructionLoadingScreen';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isPostLoginLoading, completePostLoginLoading } = useAuth();

  const handleLoadingComplete = () => {
    completePostLoginLoading();
    // Navigate to tabs after loading is complete
    router.replace('/(tabs)');
  };

  // Show loading screen if user is authenticated but post-login loading is active
  if (isAuthenticated && isPostLoginLoading) {
    return <ConstructionLoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  return <>{children}</>;
}
