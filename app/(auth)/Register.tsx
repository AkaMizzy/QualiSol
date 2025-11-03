import API_CONFIG from '@/app/config/api';
import { ICONS } from '@/constants/Icons';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

interface Country {
  name: string;
  flag: string;
}

const LabeledInput = ({ label, ...props }: TextInputProps & { label: string }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} placeholderTextColor="#9CA3AF" {...props} />
  </View>
);

export default function RegisterScreen() {
  const { register, signInWithGoogle, isLoading } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [formData, setFormData] = useState({
    company_title: '',
    pays: '',
    ville: '',
    user_phone1: '',
    user_email: '',
    user_password: '',
    confirm_password: '',
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isCountryModalVisible, setCountryModalVisible] = useState(false);
  const [isCityModalVisible, setCityModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      handleInputChange('user_email', params.email);
    }
  }, [params.email]);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "1003184877153-idnal07pq0vjods5e0pukd1ljmdafvtg.apps.googleusercontent.com",
    iosClientId: "1003184877153-pe30nmchbu9ji54o957qkh1isusesn34.apps.googleusercontent.com",
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
    if (result.success && result.email) {
      setFormData(prev => ({ ...prev, user_email: result.email ?? '' }));
      Alert.alert('Email Filled', 'Your email has been filled from your Google account. Please complete the rest of the form.');
    } else if (!result.success) {
      Alert.alert('Error', result.error || 'An error occurred during Google Sign-In.');
    }
  };

  function isValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      if (formData.user_email && isValidEmail(formData.user_email)) {
        checkEmailAvailability(formData.user_email);
      }
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [formData.user_email]);

  const checkEmailAvailability = async (email: string) => {
    setIsCheckingEmail(true);
    setEmailError('');
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setEmailError('Cette adresse e-mail est déjà utilisée.');
      } else if (response.status === 404) {
        setEmailError(''); // Email is available
      } else {
        setEmailError('Erreur lors de la vérification de l\'e-mail.');
      }
    } catch (error) {
      setEmailError('Erreur réseau. Veuillez vérifier votre connexion.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/flag/images');
        const data = await response.json();
        if (!data.error) {
          setCountries(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch countries:", error);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const selectedCountry = formData.pays;
    if (selectedCountry) {
      const fetchCities = async () => {
        setIsFetchingCities(true);
        try {
          const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: selectedCountry })
          });
          const data = await response.json();
          if (!data.error) {
            setCities(data.data);
          } else {
            setCities([]);
          }
        } catch (error) {
          console.error("Failed to fetch cities:", error);
          setCities([]);
        } finally {
            setIsFetchingCities(false);
        }
      };
      fetchCities();
    } else {
      setCities([]);
    }
  }, [formData.pays]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'pays') {
      setFormData(prev => ({ ...prev, [field]: value, ville: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };
  
  const handleSubmit = async () => {
    if (!formData.company_title.trim()) {
      Alert.alert('Erreur', "Le nom de l'entreprise est obligatoire.");
      return;
    }
    if (!formData.user_email.trim()) {
      Alert.alert('Erreur', "L'email est obligatoire.");
      return;
    }
    if (!formData.user_password.trim()) {
      Alert.alert('Erreur', 'Le mot de passe est obligatoire.');
      return;
    }
    if (!isValidEmail(formData.user_email.trim())) {
      Alert.alert('Erreur', "L'email n'est pas valide.");
      return;
    }
    if (formData.user_password !== formData.confirm_password) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    const payload = {
      company_title: formData.company_title,
      pays: formData.pays,
      ville: formData.ville,
      user_phone1: formData.user_phone1,
      user_email: formData.user_email,
      user_password: formData.user_password,
    };

    const result = await register(payload);
    if (result.success) {
    } else {
        Alert.alert('Erreur', result.error || 'Une erreur est survenue lors de l’inscription.');
    }
  };

  const handleSelectCountry = (country: Country) => {
    handleInputChange('pays', country.name);
    setCountryModalVisible(false);
    setSearchQuery('');
  };

  const handleSelectCity = (city: string) => {
    handleInputChange('ville', city);
    setCityModalVisible(false);
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#11224E" />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.header}>
            <Image
                source={ICONS.icon}
                style={styles.logoImage}
                contentFit="contain"
            />
            <Text style={styles.title}>Créer un compte</Text>
          </View>
          
          <View style={styles.card}>
            <TouchableOpacity style={styles.googleButton} onPress={() => promptAsync()}>
              <Ionicons name="logo-google" size={24} color="#fff" />
              <Text style={styles.googleButtonText}>S&apos;inscrire avec Gmail</Text>
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <LabeledInput label="Email" placeholder="Votre email de connexion" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={formData.user_email} onChangeText={(v) => handleInputChange('user_email', v)} />
            {isCheckingEmail && <ActivityIndicator size="small" color="#f87b1b" style={styles.emailFeedbackText} />}
            {emailError ? <Text style={styles.emailErrorText}>{emailError}</Text> : null}
            {!isCheckingEmail && !emailError && formData.user_email && isValidEmail(formData.user_email) && <Text style={styles.emailSuccessText}>Email disponible</Text>}
            <LabeledInput label="Nom de l'entreprise" placeholder="ex: QualiSol Inc." value={formData.company_title} onChangeText={(v) => handleInputChange('company_title', v)} />

            <LabeledInput label="Téléphone" keyboardType="phone-pad" placeholder="Votre numéro de téléphone" value={formData.user_phone1} onChangeText={(v) => handleInputChange('user_phone1', v)} />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Pays</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setCountryModalVisible(true)}>
                <Text style={styles.dropdownText}>{formData.pays || 'Sélectionner un pays'}</Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ville</Text>
              <TouchableOpacity 
                style={[styles.dropdown, !formData.pays && styles.dropdownDisabled]} 
                onPress={() => formData.pays && setCityModalVisible(true)}
                disabled={!formData.pays || isFetchingCities}
              >
                <Text style={styles.dropdownText}>{isFetchingCities ? 'Chargement...' : formData.ville || 'Sélectionner une ville'}</Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Créez un mot de passe sécurisé"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!isPasswordVisible}
                  value={formData.user_password}
                  onChangeText={(v) => handleInputChange('user_password', v)}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                />
                <TouchableOpacity onPress={() => setPasswordVisible(v => !v)} style={styles.eyeIcon}>
                  <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Retapez le mot de passe"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!isConfirmPasswordVisible}
                  value={formData.confirm_password}
                  onChangeText={(v) => handleInputChange('confirm_password', v)}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                />
                <TouchableOpacity onPress={() => setConfirmPasswordVisible(v => !v)} style={styles.eyeIcon}>
                  <Ionicons name={isConfirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitButton, (isLoading || isCheckingEmail || !!emailError) && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isLoading || isCheckingEmail || !!emailError}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Créer mon compte</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Modal */}
      <Modal visible={isCountryModalVisible} animationType="slide" onRequestClose={() => setCountryModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
          <View style={styles.modalContentContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un pays</Text>
              <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un pays..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={countries.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.countryItem} onPress={() => handleSelectCountry(item)}>
                  <Image source={{ uri: item.flag }} style={styles.flag} />
                  <Text style={styles.countryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* City Modal */}
      <Modal visible={isCityModalVisible} animationType="slide" onRequestClose={() => setCityModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
            <View style={styles.modalContentContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Sélectionner une ville</Text>
                    <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                        <Ionicons name="close" size={28} color="#333" />
                    </TouchableOpacity>
                </View>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher une ville..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <FlatList
                    data={cities.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                    <TouchableOpacity style={styles.cityItem} onPress={() => handleSelectCity(item)}>
                        <Text style={styles.cityName}>{item}</Text>
                    </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyListText}>Aucune ville trouvée ou le pays n&apos;a pas de villes répertoriées.</Text>}
                />
            </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollViewContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoImage: {
        width: 60,
        height: 60,
        marginBottom: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#11224e',
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        marginTop: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    inputContainer: {
      marginBottom: 12,
    },
    emailFeedbackText: {
      marginTop: 4,
      alignSelf: 'flex-start',
    },
    emailErrorText: {
      fontSize: 13,
      color: '#EF4444',
      marginTop: 4,
    },
    emailSuccessText: {
      fontSize: 13,
      color: '#10B981',
      marginTop: 4,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#11224e',
      marginBottom: 6,
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        borderColor: '#D1D5DB',
        borderWidth: 1,
    },
    passwordInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      paddingHorizontal: 12,
      borderColor: '#D1D5DB',
      borderWidth: 1,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 4,
      fontSize: 16,
      color: '#11224e',
      backgroundColor: 'transparent',
    },
    eyeIcon: {
      padding: 8,
    },
    dropdown: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderColor: '#D1D5DB',
      borderWidth: 1,
    },
    dropdownText: {
      fontSize: 16,
      color: '#11224e',
    },
    dropdownDisabled: {
        backgroundColor: '#E5E7EB',
    },
    submitButton: {
        backgroundColor: '#f87b1b',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f87b1b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonDisabled: {
      backgroundColor: '#F8B48B',
      shadowColor: 'transparent',
      elevation: 0,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContentContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#11224e',
    },
    searchInput: {
        marginVertical: 16,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        borderColor: '#D1D5DB',
        borderWidth: 1,
    },
    countryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#EEE',
    },
    flag: {
      width: 30,
      height: 20,
      marginRight: 12,
      borderRadius: 3,
    },
    countryName: {
      fontSize: 16,
    },
    cityItem: {
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#EEE',
    },
    cityName: {
      fontSize: 16,
    },
    emptyListText: {
      textAlign: 'center',
      marginTop: 20,
      color: '#6B7280',
    },
    navHeader: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 5,
      width: '100%',
    },
    backButton: {
      alignSelf: 'flex-start',
      padding: 5,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4285F4',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    googleButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 12,
    },
    orDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#D1D5DB',
    },
    orText: {
      marginHorizontal: 12,
      fontSize: 14,
      color: '#6B7280',
      fontWeight: '600',
    },
});
