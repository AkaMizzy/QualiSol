import * as authService from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import CustomAlert from './CustomAlert';

interface ForgetPasswordProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ForgetPassword({ visible, onClose, onSuccess }: ForgetPasswordProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; type: 'success' | 'error'; title: string; message: string }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  function showAlert(type: 'success' | 'error', title: string, message: string) {
    setAlert({ visible: true, type, title, message });
  }

  function hideAlert() {
    setAlert((prev) => ({ ...prev, visible: false }));
  }

  function isValidEmail(value: string): boolean {
    if (!value) return false;
    const re = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    return re.test(value.trim());
  }

  async function handleSubmit() {
    if (!isValidEmail(email)) {
      showAlert('error', 'Adresse e-mail invalide', "Veuillez saisir une adresse e-mail valide.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.forgetPassword(email.trim());
      setIsLoading(false);

      if (res.success) {
        showAlert('success', 'Demande envoyée', "📩 Un e-mail vous a été envoyé. Veuillez vérifier votre boîte de réception.");
        setEmail('');
        onSuccess && onSuccess();
        onClose();
        return;
      }

      showAlert('error', 'Échec', res.error || "Une erreur s'est produite. Veuillez réessayer.");
    } catch {
      setIsLoading(false);
      showAlert('error', 'Erreur réseau', 'Vérifiez votre connexion et réessayez.');
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: '#FFFFFF', borderColor: '#f87b1b' }]}>
            <Text style={[styles.title, { color: '#11224e' }]}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>Entrez votre adresse e-mail pour réinitialiser votre mot de passe.</Text>

            <View style={[styles.inputWrapper, { borderColor: '#f87b1b', backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: '#11224e' }]}
                placeholder="Adresse e-mail"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={() => !isLoading && handleSubmit()}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={isLoading}>
                <Text style={[styles.buttonText, { color: '#11224e' }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Envoyer la demande de réinitialisation"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitText}>Réinitialiser</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>Un nouveau mot de passe sera envoyé à votre adresse Gmail.</Text>
            </View>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
        duration={alert.type === 'success' ? 4000 : 5000}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    height: 52,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#f87b1b',
  },
  submitButton: {
    backgroundColor: '#f87b1b',
    borderColor: '#f87b1b',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hintContainer: {
    marginTop: 10,
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});


