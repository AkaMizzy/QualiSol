import Ionicons from '@expo/vector-icons/build/Ionicons';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

const { width: screenWidth } = Dimensions.get('window');

interface SignatureFieldProps {
  role: 'technicien' | 'control' | 'admin';
  roleLabel: string;
  onSignatureComplete: (role: string, signature: string, email: string) => void;
  isCompleted: boolean;
  disabled?: boolean;
  signerName?: string;
}

export default function SignatureFieldQualiphoto({
  role,
  roleLabel,
  onSignatureComplete,
  isCompleted,
  disabled = false,
  signerName,
}: SignatureFieldProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const signatureRef = useRef<any>(null);

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clearSignature();
    }
  };

  const handleSignature = (signature: string) => {
    if (signature) {
      onSignatureComplete(role, signature, '');
      setIsModalVisible(false);
      clearSignature();
    }
  };

  const handleSave = () => {
    // Trigger signature capture programmatically
    if (signatureRef.current) {
      signatureRef.current.readSignature();
    } else {
      Alert.alert('Validation', 'Please draw a signature');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    clearSignature();
  };

  const handleFieldPress = () => {
    if (disabled) {
      const alertMessage = isCompleted
        ? `This ${roleLabel} signature has already been completed by ${signerName || 'unknown user'}.`
        : `You are not authorized to sign as ${roleLabel} for this project.`;
      Alert.alert(
        isCompleted ? 'Signature Already Completed' : 'Access Denied',
        alertMessage,
        [{ text: 'OK' }]
      );
      return;
    }
    setIsModalVisible(true);
  };

  const getRoleIcon = (role: string) => {
    return '✍️'; // Use handwriting emoji for all roles
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'technicien':
        return '#34C759';
      case 'control':
        return '#007AFF';
      case 'admin':
        return '#FF9500';
      default:
        return '#11224e';
    }
  };

  return (
    <>
      <Pressable
        style={[
          styles.signatureField,
          isCompleted && styles.completedField,
          disabled && styles.disabledField,
          { borderColor: getRoleColor(role) },
        ]}
        onPress={handleFieldPress}
        disabled={disabled}
      >
        <View style={styles.fieldContent}>
          <View style={styles.fieldHeader}>
            <Text style={styles.roleIcon}>{getRoleIcon(role)}</Text>
            <Text style={[
              styles.roleLabel, 
              { color: disabled ? '#9CA3AF' : getRoleColor(role) }
            ]}>
              {roleLabel}
            </Text>
            {isCompleted && (
              <Ionicons name="checkmark-circle" size={18} color="#34C759" />
            )}
            {disabled && !isCompleted && (
              <Ionicons name="lock-closed" size={16} color="#6B7280" />
            )}
          </View>
        </View>
      </Pressable>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerContent}>
                <Text style={styles.modalTitle}>Signature numérique</Text>
                <Text style={styles.modalSubtitle}>{roleLabel}</Text>
              </View>
              <Pressable onPress={handleCancel} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Content */}
            <View style={styles.modalContent}>
              {/* Signature Canvas */}
              <View style={styles.signatureSection}>
                <Text style={styles.inputLabel}>Signature</Text>
                <View style={styles.canvasContainer}>
                  <SignatureCanvas
                    ref={signatureRef}
                    onOK={handleSignature}
                    descriptionText=""
                    clearText=""
                    confirmText=""
                    webStyle={`
                      .m-signature-pad {
                        box-shadow: none;
                        border: none;
                        background-color: transparent;
                        width: 100%;
                        height: 100%;
                      }
                      .m-signature-pad--body {
                        background-color: #FAFAFA;
                        height: 100%;
                        border: 2px dashed #D1D5DB;
                        border-radius: 12px;
                        position: relative;
                      }
                      .m-signature-pad--body canvas {
                        background-color: transparent;
                        border: none;
                        border-radius: 12px;
                        width: 100% !important;
                        height: 100% !important;
                        cursor: crosshair;
                      }
                      .m-signature-pad--footer {
                        display: none !important;
                      }
                      .m-signature-pad--footer button {
                        display: none !important;
                      }
                      .m-signature-pad--body::before {
                        content: "Signez ici";
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: #9CA3AF;
                        font-size: 16px;
                        font-weight: 500;
                        pointer-events: none;
                        z-index: 1;
                        text-align: center;
                      }
                    `}
                    style={styles.signatureCanvas}
                    backgroundColor="transparent"
                    penColor="#11224e"
                    minWidth={2}
                    maxWidth={3}
                    imageType="image/png"
                    trimWhitespace={true}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Pressable onPress={clearSignature} style={styles.secondaryButton}>
                  <Ionicons name="refresh" size={18} color="#f87b1b" />
                  <Text style={styles.secondaryButtonText}>Effacer</Text>
                </Pressable>
                <Pressable onPress={handleSave} style={styles.primaryButton}>
                  <Ionicons name="checkmark" size={18} color="#f87b1b" />
                  <Text style={styles.primaryButtonText}>Confirmer</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  signatureField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 2,
  },
  completedField: {
    borderColor: '#34C759',
    backgroundColor: '#F0FDF4',
  },
  disabledField: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
  },
  fieldContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingVertical: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  roleIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalContent: {
    padding: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  signatureSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emailInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  canvasContainer: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 420,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureCanvas: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f87b1b',
    gap: 8,
    shadowColor: '#f87b1b',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#f87b1b',
    fontWeight: '700',
    fontSize: 16,
  },
});
