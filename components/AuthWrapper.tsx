import { useAuth } from '@/contexts/AuthContext';
import { router, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import ConstructionLoadingScreen from './ConstructionLoadingScreen';
import ImportantMessageScreen from './ImportantMessageScreen';
import { clearImportantMessage } from '@/services/userService';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, isPostLoginLoading, completePostLoginLoading, user } = useAuth();
  const segments = useSegments();

  const [showingCompanyMessage, setShowingCompanyMessage] = useState(false);
  const [showingUserMessage, setShowingUserMessage] = useState(false);
  const [messagesAcknowledged, setMessagesAcknowledged] = useState(false);

  useEffect(() => {
    // Determine if messages need to be shown right after post-login loading completes
    if (isAuthenticated && !isPostLoginLoading && !messagesAcknowledged) {
      if (user?.company_important) {
        setShowingCompanyMessage(true);
      } else if (user?.user_important) {
        setShowingUserMessage(true);
      } else {
        setMessagesAcknowledged(true);
      }
    }
  }, [isAuthenticated, isPostLoginLoading, messagesAcknowledged, user]);

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is loaded

    // Don't perform navigation actions while the post-login loading screen is active.
    if (isPostLoginLoading) return;

    // Wait for important messages to be acknowledged before navigating
    if (isAuthenticated && !messagesAcknowledged) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // If the user is authenticated and is in the auth group (e.g., login page),
      // redirect them to the main app. Platform-specific: web goes to webhome, mobile to tabs.
      router.replace('/(tabs)');
      
    } else if (!isAuthenticated && !inAuthGroup) {
      // If the user is not authenticated and is not in the auth group,
      // redirect them to the login page.
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, isPostLoginLoading, segments, messagesAcknowledged]);

  const handleCompanyMessageClose = () => {
    setShowingCompanyMessage(false);
    if (user?.user_important) {
      setShowingUserMessage(true);
    } else {
      setMessagesAcknowledged(true);
    }
  };

  const handleUserMessageClose = async () => {
    setShowingUserMessage(false);
    setMessagesAcknowledged(true);
    try {
      await clearImportantMessage();
    } catch (error) {
      console.error('Failed to clear user important message', error);
    }
  };

  if (isLoading) {
    // This is for the initial app load, checking for a stored token.
    return <ConstructionLoadingScreen onLoadingComplete={() => {}} />;
  }
  
  // After a successful login, show the loading screen before navigating.
  if (isAuthenticated && isPostLoginLoading) {
    return <ConstructionLoadingScreen onLoadingComplete={completePostLoginLoading} />;
  }

  if (showingCompanyMessage && user?.company_important) {
    return <ImportantMessageScreen content={user.company_important} onClose={handleCompanyMessageClose} />;
  }

  if (showingUserMessage && user?.user_important) {
    return <ImportantMessageScreen content={user.user_important} onClose={handleUserMessageClose} />;
  }

  return <>{children}</>;
}
