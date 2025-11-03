import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ICONS } from '@/constants/Icons';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ServerDownModal({ visible, onClose }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.95, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Image
            source={ICONS.constructionGif}
            style={styles.gif}
            contentFit="contain"
            accessibilityLabel="Illustration de serveur en panne"
          />
          <Text style={styles.title}>🛠️ Service momentanément indisponible</Text>
          <Text style={styles.message}>Nous rencontrons un incident technique. Veuillez réessayer plus tard.</Text>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Fermer">
              <Text style={styles.closeText}>Fermer</Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '85%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#11224e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    alignItems: 'center',
  },
  gif: {
    width: 180,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11224e',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
  },
  actions: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#11224e',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: { opacity: 0.85 },
});


