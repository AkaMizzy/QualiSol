import { useAuth } from '@/contexts/AuthContext';
import { router, useSegments } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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

  // Track which user we've already processed messages for.
  // This prevents the race condition where `user` is set BEFORE `isPostLoginLoading`
  // becomes false — causing the effect to fire with incomplete state and skip messages.
  const lastProcessedUserId = useRef<string | null>(null);

  // Reset all message state on logout so the next login starts fresh.
  useEffect(() => {
    if (!isAuthenticated) {
      lastProcessedUserId.current = null;
      setMessagesAcknowledged(false);
      setShowingCompanyMessage(false);
      setShowingUserMessage(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Only run after auth is complete and the post-login animation has finished.
    if (!isAuthenticated || isPostLoginLoading || messagesAcknowledged) return;

    // If we've already started showing messages for this exact user, don't re-trigger.
    if (user?.id && lastProcessedUserId.current === user.id) return;

    // Mark this user as processed so subsequent re-renders don't re-trigger.
    if (user?.id) {
      lastProcessedUserId.current = user.id;
    }

    // Company message always shows (never cleared from backend).
    if (user?.company_important) {
      setShowingCompanyMessage(true);
    } else if (user?.user_important) {
      setShowingUserMessage(true);
    } else {
      setMessagesAcknowledged(true);
    }
  }, [isAuthenticated, isPostLoginLoading, messagesAcknowledged, user]);

  useEffect(() => {
    if (isLoading) return;
    if (isPostLoginLoading) return;
    if (isAuthenticated && !messagesAcknowledged) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
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
    return (
      <>
        {children}
        <View style={StyleSheet.absoluteFill}>
          <ConstructionLoadingScreen onLoadingComplete={() => {}} />
        </View>
      </>
    );
  }

  if (isAuthenticated && isPostLoginLoading) {
    return (
      <>
        {children}
        <View style={StyleSheet.absoluteFill}>
          <ConstructionLoadingScreen onLoadingComplete={completePostLoginLoading} />
        </View>
      </>
    );
  }

  return (
    <>
      {children}
      {showingCompanyMessage && user?.company_important ? (
        <View style={StyleSheet.absoluteFill}>
          <ImportantMessageScreen
            content={user.company_important}
            onClose={handleCompanyMessageClose}
            type="company"
          />
        </View>
      ) : showingUserMessage && user?.user_important ? (
        <View style={StyleSheet.absoluteFill}>
          <ImportantMessageScreen
            content={user.user_important}
            onClose={handleUserMessageClose}
            type="user"
          />
        </View>
      ) : null}
    </>
  );
}
