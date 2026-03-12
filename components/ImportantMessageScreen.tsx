import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ImportantMessageScreenProps {
  content: string;
  onClose: () => void;
  type?: 'company' | 'user';
}

export default function ImportantMessageScreen({
  content,
  onClose,
  type = 'company',
}: ImportantMessageScreenProps) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const isCompany = type === 'company';

  const accentColor = isCompany ? '#f87b1b' : '#2563eb';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* App header — shows branding even before the dashboard */}
      <AppHeader
        user={user || undefined}
        showNotifications={false}
      />



      {/* HTML content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentCard}>
          <RenderHtml
            contentWidth={width - 64}
            source={{ html: content }}
            baseStyle={{
              fontSize: 15,
              color: '#1e293b',
              lineHeight: 22,
            }}
            defaultTextProps={{ selectable: true }}
            tagsStyles={{
              b:      { fontWeight: '700', color: '#11224e' },
              strong: { fontWeight: '700', color: '#11224e' },
              u:      { textDecorationLine: 'underline' },
              i:      { fontStyle: 'italic', color: '#374151' },
              em:     { fontStyle: 'italic', color: '#374151' },
              h1:     { fontSize: 20, fontWeight: '700', color: accentColor, marginBottom: 6 },
              h2:     { fontSize: 17, fontWeight: '700', color: '#11224e', marginBottom: 4 },
              h3:     { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 2 },
              p:      { marginBottom: 10 },
              li:     { marginBottom: 4 },
              a:      { color: accentColor, textDecorationLine: 'underline' },
            }}
          />
        </View>
      </ScrollView>

      {/* Sticky footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: accentColor }]}
          onPress={onClose}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.ctaText}>J'ai compris</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  footerNote: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
});
