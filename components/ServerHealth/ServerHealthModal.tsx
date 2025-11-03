import { ICONS } from '@/constants/Icons';
import { getHealthStatus } from '@/services/health';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type HealthStatus = 'idle' | 'loading' | 'ok' | 'down' | 'error';

export default function ServerHealthModal({ visible, onClose }: Props) {
  const [status, setStatus] = useState<HealthStatus>('idle');
  const [message, setMessage] = useState<string>('');


  function getStatusColor(): string {
    if (status === 'ok') return '#16a34a';
    if (status === 'down' || status === 'error') return '#dc2626';
    return '#6B7280';
  }

  const checkHealth = useCallback(async (): Promise<void> => {
    setStatus('loading');
    setMessage('');
    const res = await getHealthStatus();
    setStatus(res.status === 'ok' ? 'ok' : res.status === 'down' ? 'down' : 'error');
    setMessage(res.message);
  }, []);

  useEffect(() => {
    if (!visible) return;
    void checkHealth();
  }, [visible, checkHealth]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.card} accessibilityLabel="Server status modal">
          <Text style={styles.title}>Server Health</Text>

          {(status === 'down' || status === 'error') && (
            <Image
              source={ICONS.constructionGif}
              style={styles.gif}
              contentFit="contain"
              accessibilityLabel="Illustration d'indisponibilité"
            />
          )}

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>
              {status === 'idle' && 'Tap "Check" to start'}
              {status === 'loading' && 'Checking...'}
              {status === 'ok' && 'Server is up'}
              {status === 'down' && 'Server is down'}
              {status === 'error' && 'Unable to reach server'}
            </Text>
          </View>

          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.actions}>
            <Pressable
              onPress={checkHealth}
              style={({ pressed }) => [styles.actionButton, styles.checkButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Check server health"
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionText}>Check</Text>
              )}
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.actionButton, styles.closeButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.actionText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#f87b1b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  gif: {
    width: 180,
    height: 120,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11224e',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#11224e',
    fontWeight: '600',
  },
  message: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkButton: {
    backgroundColor: '#16a34a',
    marginRight: 8,
  },
  closeButton: {
    backgroundColor: '#f87b1b',
    marginLeft: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});


