import { useAuth } from '@/contexts/AuthContext';
import { startHealthPolling } from '@/services/health';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import ServerDownModal from '../../components/ServerHealth/ServerDownModal';
import ServerHealthModal from '../../components/ServerHealth/ServerHealthModal';
import { ICONS } from '../../constants/Icons';

WebBrowser.maybeCompleteAuthSession();

interface LoginForm {
  email: string;
  password: string;
}

interface AlertState {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}



export default function LoginScreen() {
  const { login, signInWithGoogle, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });
  const [isForgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [isHealthModalVisible, setHealthModalVisible] = useState(false);
  const [isDownModalDismissed, setDownModalDismissed] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'loading' | 'ok' | 'down' | 'error'>('unknown');

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "1003184877153-pe30nmchbu9ji54o957qkh1isusesn34.apps.googleusercontent.com",
    webClientId: "1003184877153-idnal07pq0vjods5e0pukd1ljmdafvtg.apps.googleusercontent.com",
    androidClientId: "1003184877153-t0lfqit1m2q63jjj5hjqubgco0agk56b.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleSignIn(authentication.accessToken);
      }
    }
  }, [response]);

  const handleGoogleSignIn = async (accessToken: string) => {
    const result = await signInWithGoogle(accessToken);
    if (result.success) {
      if (result.email) {
        // User does not exist, redirect to register screen with email pre-filled
        router.push({ pathname: '/Register', params: { email: result.email } });
      } else {
        // User exists and is logged in
        showAlert('success', 'Login Successful!', 'Welcome back to QualiSol.');
      }
    } else {
      showAlert('error', 'Login Failed', result.error || 'Could not sign in with Google.');
    }
  };

  // Watch for authentication changes - navigation will be handled by AuthWrapper
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Login successful, post-login loading will begin...');
    }
  }, [isAuthenticated]);

  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleInputFocus = (field: string) => {
    setFocusedField(field);
  };

  const handleInputBlur = () => {
    setFocusedField(null);
  };

  const showAlert = (type: 'success' | 'error', title: string, message: string) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
    });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      showAlert('error', 'Missing Information', 'Please fill in all fields to continue.');
      return;
    }

    const result = await login(form.email, form.password);
    
    if (result.success) {
      showAlert('success', 'Login Successful!', 'Welcome to QualiSol. Redirecting to your workspace...');
    } else {
      showAlert('error', 'Login Failed', result.error || 'Invalid credentials. Please check your email and password.');
    }
  };

  // Server health: auto-check on mount and poll periodically via service
  useEffect(() => {
    setServerStatus('loading');
    const stop = startHealthPolling((res) => setServerStatus(res.status));
    return () => stop();
  }, []);

  function getHealthColor(): string {
    if (serverStatus === 'ok') return '#16a34a'; // green
    if (serverStatus === 'down' || serverStatus === 'error') return '#dc2626'; // red
    return '#6B7280'; // neutral while loading/unknown
  }

  // Reset dismiss when server is back online
  useEffect(() => {
    if (serverStatus === 'ok') setDownModalDismissed(false);
  }, [serverStatus]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.mainContent}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Image
                    source={ICONS.newIcon}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
                
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Identifiant</Text>
                  <View style={[
                    styles.inputWrapper,
                    focusedField === 'email' && styles.inputWrapperFocused
                  ]}>
                    <Ionicons
                      name="person-outline"
                      size={22}
                      color={focusedField === 'email' ? '#f87b1b' : '#6B7280'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter l'identifiant"
                      placeholderTextColor="#9CA3AF"
                      value={form.email}
                      onChangeText={(value) => handleInputChange('email', value)}
                      onFocus={() => handleInputFocus('email')}
                      onBlur={handleInputBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={[
                    styles.inputWrapper,
                    focusedField === 'password' && styles.inputWrapperFocused
                  ]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={22}
                      color={focusedField === 'password' ? '#f87b1b' : '#6B7280'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter le mot de passe"
                      placeholderTextColor="#9CA3AF"
                      value={form.password}
                      onChangeText={(value) => handleInputChange('password', value)}
                      onFocus={() => handleInputFocus('password')}
                      onBlur={handleInputBlur}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color={focusedField === 'password' ? '#f87b1b' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => setForgotPasswordModalVisible(true)}
                >
                  <Text style={styles.forgotPasswordText}>Mot de passe oublié?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                  )}
                </TouchableOpacity>

              {/* Health Check Trigger moved to floating button */}

                <View style={styles.orDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity onPress={() => promptAsync()} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Sign in with Google">
                  <LinearGradient
                    colors={["#EA4335", "#FBBC05", "#34A853", "#4285F4", "#A142F4"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.googleButtonBorder}
                  >
                    <View style={styles.googleButtonInner}>
                      <Image source={ICONS.google} style={styles.googleIcon} contentFit="contain" />
                      <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Vous n&apos;avez pas de compte?{' '}
                <Link href="/Register" style={styles.footerLink}>
                  Créer un compte
                </Link>
              </Text>
              <Text style={styles.copyrightText}>
                <Text style={styles.copyrightBrand}>QualiSol</Text> ©{new Date().getFullYear()}. Tous droits réservés.
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://www.muntadaa.com')}
                accessibilityRole="link"
                accessibilityHint="Ouvre www.muntaada.com dans le navigateur"
              >
                <Text style={styles.websiteText}>www.muntaada.com</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Custom Alert */}
      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
        duration={alert.type === 'success' ? 2000 : 4000}
      />

      <ForgotPasswordModal
        visible={isForgotPasswordModalVisible}
        onClose={() => setForgotPasswordModalVisible(false)}
      />

      <ServerHealthModal
        visible={isHealthModalVisible}
        onClose={() => setHealthModalVisible(false)}
      />

      {/* Automatic server down alert */}
      <ServerDownModal
        visible={(serverStatus === 'down' || serverStatus === 'error') && !isDownModalDismissed}
        onClose={() => setDownModalDismissed(true)}
      />

      {/* Floating Health FAB */}
      <TouchableOpacity
        style={[styles.healthFab, { backgroundColor: getHealthColor() }]}
        onPress={() => setHealthModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Open server health check"
        activeOpacity={0.8}
      >
        <Ionicons name="pulse" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoContainer: {
    width: 130,
    height: 130,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#11224e',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#f87b1b',
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f87b1b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87b1b',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f87b1b',
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: '#f87b1b',
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#11224e',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#f87b1b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#f87b1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  healthFab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f87b1b',
    marginBottom: 10,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 12,
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  googleButtonBorder: {
    borderRadius: 14,
    padding: 2,
    marginTop: 12,
  },
  googleButtonInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  forgotPasswordText: {
    color: '#f87b1b',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerLink: {
    color: '#f87b1b',
    fontWeight: '800',
    fontSize: 15,
  },
  copyrightText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 24,
  },
  copyrightBrand: {
    fontWeight: 'bold',
    color: '#11224e',
  },
  websiteText: {
    fontSize: 14,
    color: '#f87b1b',
    fontWeight: '600',
    marginTop: 4,
  }
});
