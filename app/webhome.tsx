import WebLayout from '@/components/web/WebLayout';
import React from 'react';
import { Platform } from 'react-native';

export default function WebHomeScreen() {
  // This screen is only accessible on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  return <WebLayout />;
}
