import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import React from 'react';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  console.log('Index component - Auth state:', { isAuthenticated, isLoading });

  if (isLoading) {
    return <LoadingScreen message="Initializing..." />;
  }

  // No redirects - let the auth context handle navigation
  if (isAuthenticated) {
    console.log('User is authenticated, redirecting to tabs...');
    // Platform-specific redirect: web goes to webhome, mobile goes to tabs
    if (require('react-native').Platform.OS === 'web') {
      return <Redirect href="/webhome" />;
    }
    return <Redirect href="/(tabs)" />;
  } else {
    console.log('User is not authenticated, redirecting to login...');
    return <Redirect href="/(auth)/login" />;
  }
}
