import { ICONS } from '@/constants/Icons';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';


interface CustomAlertButton {
  text: string;
  onPress: () => void;
  style?: 'primary' | 'destructive' | 'default';
}

interface CustomAlertProps {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
  duration?: number; // Auto-close duration in milliseconds
  buttons?: CustomAlertButton[];
}

export default function CustomAlert({
  visible,
  type,
  title,
  message,
  onClose,
  duration = 3000,
  buttons,
}: CustomAlertProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-close after duration, only if there are no buttons
      if (duration > 0 && (!buttons || buttons.length === 0)) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration, buttons]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getIconName = () => {
    return type === 'success' ? 'checkmark-circle' : 'alert-circle';
  };

  const getColors = () => {
    if (type === 'success') {
      return {
        primary: '#10B981',
        background: '#ECFDF5',
        border: '#D1FAE5',
        icon: '#10B981',
      };
    } else {
      return {
        primary: '#EF4444',
        background: '#FEF2F2',
        border: '#FECACA',
        icon: '#EF4444',
      };
    }
  };

  const colors = getColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.alertContainer,
              {
                transform: [{ scale: scaleAnim }],
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Icon / Image */}
              <View style={styles.iconContainer}>
                {type === 'success' ? (
                  <View style={styles.imageWrapper}>
                    <Image source={ICONS.newIcon} style={styles.image} contentFit="contain" />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.iconBackground,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons
                      name={getIconName()}
                      size={32}
                      color="#FFFFFF"
                    />
                  </View>
                )}
              </View>

              {/* Content */}
              <View style={styles.content}>
                <Text style={[styles.title, { color: colors.primary }]}>
                  {title}
                </Text>
                <Text style={styles.message}>{message}</Text>
              </View>

              {/* Buttons */}
              {buttons && buttons.length > 0 && (
                <View style={styles.buttonContainer}>
                  {buttons.map((button, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        button.style === 'primary' && { backgroundColor: colors.primary },
                        button.style === 'destructive' && { backgroundColor: '#F3F4F6' },
                        buttons.length === 1 && { flex: 1 },
                      ]}
                      onPress={() => {
                        handleClose();
                        // A slight delay to allow the close animation to start before firing the action
                        setTimeout(() => button.onPress(), 100);
                      }}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          button.style === 'primary' && { color: '#FFFFFF' },
                          button.style === 'destructive' && { color: '#EF4444' },
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Close Button */}
              {(!buttons || buttons.length === 0) && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  imageWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#f87b1b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  image: {
    width: 80,
    height: 80,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
