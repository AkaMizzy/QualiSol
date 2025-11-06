import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CaptchaModalProps {
  visible: boolean;
  captcha: string;
  onClose: () => void;
  onVerify: (input: string) => boolean;
  onRefresh: () => void;
}

export default function CaptchaModal({ visible, captcha, onClose, onVerify, onRefresh }: CaptchaModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (onVerify(input)) {
      setInput('');
      setError('');
      onClose();
    } else {
      setError('Code incorrect, veuillez réessayer.');
      setInput('');
    }
  };

  const handleRefresh = () => {
    onRefresh();
    setInput('');
    setError('');
  };

  const handleClose = () => {
    setInput('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView style={styles.modalContent}>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} accessibilityRole="button" accessibilityLabel="Regénérer le code">
            <Ionicons name="refresh-outline" size={26} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Fermer">
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Vérification</Text>
          <Text style={styles.modalSubtitle}>Pour continuer, veuillez saisir le code ci-dessous.</Text>
          
          <View style={styles.captchaContainer}>
            <Text style={styles.captchaText}>{captcha}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="keypad-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              placeholder="Saisir le code"
              style={styles.input}
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              placeholderTextColor="#888"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} accessibilityRole="button" accessibilityLabel="Vérifier le code">
            <Text style={styles.verifyButtonText}>Vérifier</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  refreshButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#11224e',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  captchaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f87b1b',
    width: '100%',
  },
  captchaText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    color: '#11224e',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#f87b1b',
    width: '100%',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: '#f87b1b',
    borderRadius: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
