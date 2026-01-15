import * as authService from '@/services/authService';
import { getConnectivity, startConnectivityMonitoring } from '@/services/connectivity';
import { getHealthStatus, startHealthPolling } from '@/services/health';
import { Ionicons } from '@expo/vector-icons';
 
import * as Google from 'expo-auth-session/providers/google';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ConnectivityModal from '../../components/Connectivity/ConnectivityModal';
import CustomAlert from '../../components/CustomAlert';
import ForgetPassword from '../../components/ForgetPassword';
import ServerDownModal from '../../components/ServerHealth/ServerDownModal';
import ServerHealthModal from '../../components/ServerHealth/ServerHealthModal';
import { ICONS } from '../../constants/Icons';
import { useAuth } from '../../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

interface LoginForm { identifier: string; password: string }

interface AlertState {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function LoginScreen() {
  const { setLoginData } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const [form, setForm] = useState<LoginForm>({ identifier: '', password: '' });
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
  const [isOffline, setIsOffline] = useState(false);
  const [isConnectivityDismissed, setConnectivityDismissed] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'loading' | 'ok' | 'down' | 'error'>('unknown');
  const [isLoading, setIsLoading] = useState(false);

  const isTablet = width >= 768;

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "1003184877153-pe30nmchbu9ji54o957qkh1isusesn34.apps.googleusercontent.com",
    webClientId: "1003184877153-idnal07pq0vjods5e0pukd1ljmdafvtg.apps.googleusercontent.com",
    androidClientId: "1003184877153-t0lfqit1m2q63jjj5hjqubgco0agk56b.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const anyResp: any = response;
      const { authentication } = anyResp;
      if (authentication?.accessToken) handleGoogleSignIn(authentication.accessToken);
    }
  }, [response]);

  const handleGoogleSignIn = async (accessToken: string) => {
    showAlert('error', 'Bientôt disponible', 'La connexion avec Google est en cours de développement.');
  };


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
    if (!form.identifier || !form.password) {
      showAlert('error', 'Missing Information', 'Please fill in all fields to continue.');
      return;
    }

    setIsLoading(true);
    const result = await authService.login({ identifier: form.identifier, password: form.password });
    setIsLoading(false);
    if (result.success) {
      // The router.replace will be handled by the AuthWrapper now
      // We just need to set the login data in the context
      await setLoginData(result.data);
    } else {
      showAlert('error', 'Login Failed', result.error || 'Invalid credentials.');
    }
  };

  // Server health: auto-check on mount and poll periodically via service
  useEffect(() => {
    setServerStatus('loading');
    const stop = startHealthPolling((res) => setServerStatus(res.status));
    return () => stop();
  }, []);

  // Connectivity monitoring
  useEffect(() => {
    const stop = startConnectivityMonitoring((res) => {
      const offline = res.status === 'offline';
      setIsOffline(offline);
      if (!offline) setConnectivityDismissed(false);
    }, 15000);
    return () => stop();
  }, []);

  function getHealthColor(): string {
    if (serverStatus === 'ok') return '#16a34a'; // green
    if (serverStatus === 'down' || serverStatus === 'error') return '#f87b1b'; 
    return '#6B7280'; // neutral while loading/unknown
  }

  // Reset dismiss when server is back online
  useEffect(() => {
    if (serverStatus === 'ok') setDownModalDismissed(false);
  }, [serverStatus]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f7f7f7', '#e7e7e7']}
        style={styles.gradient}
      />
      {/* Decorative Shapes */}
      <View style={styles.shape1} />
      <View style={styles.shape2} />
      <View style={styles.shape3} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          enabled={false}
          behavior={undefined}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
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
                <View style={[styles.formContainer, isTablet && styles.formContainerTablet]}>
                  {/* identifier Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>identifier</Text>
                    <View style={[
                      styles.inputWrapper,
                      focusedField === 'identifier' && styles.inputWrapperFocused
                    ]}>
                      <Ionicons
                        name="person-outline"
                        size={22}
                        color={focusedField === 'identifier' ? '#f87b1b' : '#6B7280'}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Entrer l'identifiant"
                        placeholderTextColor="#9CA3AF"
                        value={form.identifier}
                        onChangeText={(value) => handleInputChange('identifier', value)}
                        onFocus={() => handleInputFocus('identifier')}
                        onBlur={handleInputBlur}
                        keyboardType="default"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Mot de passe</Text>
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

                  {/* Register Button */}
                  <TouchableOpacity
                    style={styles.registerButton}
                    onPress={() => router.push('/(auth)/Register')}
                    accessibilityRole="button"
                    accessibilityLabel="S'inscrire"
                  >
                    <Text style={styles.registerButtonText}>Pas encore de compte ? <Text style={styles.registerButtonLink}>S'inscrire</Text></Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Footer */}
              <View style={[styles.footer, { paddingBottom: Math.max(16, bottom) }]}>
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
        </KeyboardAvoidingView>
        
        
        <CustomAlert
          visible={alert.visible}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={hideAlert}
          duration={alert.type === 'success' ? 2000 : 4000}
        />


        <ServerHealthModal
          visible={isHealthModalVisible}
          onClose={() => setHealthModalVisible(false)}
        />

        {/* Automatic server down alert */}
        <ServerDownModal
          visible={(serverStatus === 'down' || serverStatus === 'error') && !isDownModalDismissed}
          onClose={() => setDownModalDismissed(true)}
          onRetry={async () => {
            const res = await getHealthStatus();
            setServerStatus(res.status);
          }}
        />

        {/* Connectivity alert */}
        <ConnectivityModal
          visible={isOffline && !isConnectivityDismissed}
          onRetry={async () => {
            const res = await getConnectivity();
            const offline = res.status === 'offline';
            setIsOffline(offline);
            if (!offline) setConnectivityDismissed(false);
          }}
          onClose={() => setConnectivityDismissed(true)}
        />

        <ForgetPassword
          visible={isForgotPasswordModalVisible}
          onClose={() => setForgotPasswordModalVisible(false)}
          onSuccess={() => {
            // Surface top-level success and keep user on login
            setForgotPasswordModalVisible(false);
            setTimeout(() => {
              setAlert({
                visible: true,
                type: 'success',
                title: 'Demande envoyée',
                message: '📩 Un e-mail vous a été envoyé. Veuillez vérifier votre boîte de réception.',
              });
            }, 50);
          }}
        />

        {/* Floating Health FAB (non-clickable indicator) */}
        <TouchableOpacity
          style={[styles.healthFab, { backgroundColor: getHealthColor(), bottom: bottom + 16 }]}
          disabled
          accessibilityRole="button"
          accessibilityLabel="Server health indicator"
          accessibilityState={{ disabled: true }}
          activeOpacity={1}
        >
          <Ionicons name="pulse" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shape1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(248, 123, 27, 0.1)',
    top: -80,
    left: -100,
  },
  shape2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(248, 123, 27, 0.1)',
    bottom: -70,
    right: -80,
  },
  shape3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(248, 123, 27, 0.05)',
    bottom: '30%',
    left: 20,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
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
    paddingHorizontal: 24,
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
    width: 110,
    aspectRatio: 1,
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
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  formContainerTablet: {
    maxWidth: 450,
    alignSelf: 'center',
    width: '100%',
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
    paddingVertical: 14,
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
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    alignSelf: 'center',
    marginHorizontal: 12,
    paddingHorizontal: 6,
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    textAlignVertical: 'center',
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
    paddingVertical: 12,
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
    flexShrink: 0,
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
  },
  registerButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  registerButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerButtonLink: {
    color: '#f87b1b',
    fontWeight: '700',
  },
});
