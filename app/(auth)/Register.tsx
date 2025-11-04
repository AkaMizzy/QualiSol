import CustomAlert from '@/components/CustomAlert';
import { ICONS } from '@/constants/Icons';
import { checkEmailExists, signup } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Country {
  name: string;
  flag: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    pays: '',
    ville: '',
    phone: '',
    email: '',
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isCountryModalVisible, setCountryModalVisible] = useState(false);
  const [isCityModalVisible, setCityModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertState, setAlertState] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });
  const [isEmailAvailable, setIsEmailAvailable] = useState(false);

  function isValidEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  }

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

  const checkEmailAvailability = async () => {
    if (!formData.email) {
      setEmailError('');
      setIsEmailAvailable(false);
      return;
    }
    if (!isValidEmail(formData.email)) {
      setEmailError("Adresse e-mail invalide.");
      setIsEmailAvailable(false);
      return;
    }
    setIsCheckingEmail(true);
    try {
      const { exists } = await checkEmailExists(formData.email);
      if (exists) {
        setEmailError('Cet email est déjà utilisé.');
        setIsEmailAvailable(false);
      } else {
        setEmailError('');
        setIsEmailAvailable(true);
      }
    } catch (error) {
      setEmailError("Erreur lors de la vérification de l'email.");
      setIsEmailAvailable(false);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValidEmail(formData.email)) {
      setAlertState({ visible: true, type: 'error', title: 'Erreur', message: "Adresse e-mail invalide." });
      return;
    }
    if (emailError) {
      setAlertState({ visible: true, type: 'error', title: 'Erreur', message: emailError });
      return;
    }
    const requiredFields = ['title', 'email', 'phone', 'pays', 'ville'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        setAlertState({ visible: true, type: 'error', title: 'Champs requis', message: `Le champ '${field}' est requis.` });
        return;
      }
    }

    setIsLoading(true);
    const result = await signup(formData);
    setIsLoading(false);

    if (result.success) {
      setAlertState({ visible: true, type: 'success', title: 'Succès', message: '✅ Votre compte a été créé avec succès. Consultez votre boîte mail pour le mot de passe.' });
      setTimeout(() => router.push('/login'), 1200);
    } else {
      setAlertState({ visible: true, type: 'error', title: 'Erreur', message: `⚠️ ${result.error}` });
    }
  };

  const handleSelectCountry = (countryName: string) => {
    handleInputChange('pays', countryName);
    setCountryModalVisible(false);
    setSearchQuery('');
  };

  const handleSelectCity = (cityName: string) => {
    handleInputChange('ville', cityName);
    setCityModalVisible(false);
    setSearchQuery('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.header}>
            <Image source={ICONS.icon} style={styles.logo} contentFit="contain" />
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez la communauté qualisol</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Ionicons name="business-outline" style={styles.inputIcon} />
              <TextInput
                placeholder="Nom de l'entreprise"
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                placeholderTextColor="#888"
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" style={styles.inputIcon} />
              <TextInput
                placeholder="Email"
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => { setIsEmailAvailable(false); setEmailError(''); handleInputChange('email', text); }}
                onBlur={checkEmailAvailability}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#888"
              />
              {isCheckingEmail ? (
                <ActivityIndicator size="small" />
              ) : (
                isEmailAvailable && !emailError ? (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                ) : null
              )}
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <View style={styles.inputGroup}>
              <Ionicons name="call-outline" style={styles.inputIcon} />
              <TextInput
                placeholder="Téléphone"
                style={styles.input}  
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                keyboardType="phone-pad"
                placeholderTextColor="#888"
              />
            </View>

            <TouchableOpacity style={styles.inputGroup} onPress={() => setCountryModalVisible(true)}>
              <Ionicons name="globe-outline" style={styles.inputIcon} />
              <Text style={[styles.input, !formData.pays && styles.placeholderText]}>
                {formData.pays || 'Pays'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inputGroup, !formData.pays && styles.disabledInput]}
              onPress={() => formData.pays && setCityModalVisible(true)}
              disabled={!formData.pays}
            >
              <Ionicons name="map-outline" style={styles.inputIcon} />
              <Text style={[styles.input, !formData.ville && styles.placeholderText]}>
                {formData.ville || 'Ville'}
              </Text>
              {isFetchingCities && <ActivityIndicator size="small" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>S&apos;inscrire</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous avez déjà un compte?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.signInText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Modal */}
      <Modal
        visible={isCountryModalVisible}
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
        statusBarTranslucent={false}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
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
              <TouchableOpacity style={styles.countryItem} onPress={() => handleSelectCountry(item.name)}>
                <Image source={{ uri: item.flag }} style={styles.flag} />
                <Text style={styles.countryName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* City Modal */}
      <Modal
        visible={isCityModalVisible}
        animationType="slide"
        onRequestClose={() => setCityModalVisible(false)}
        statusBarTranslucent={false}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
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
            ListEmptyComponent={<Text style={styles.emptyListText}>Aucune ville trouvée.</Text>}
          />
        </SafeAreaView>
      </Modal>

      <CustomAlert
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState(prev => ({ ...prev, visible: false }))}
        duration={5000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#11224e',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  form: {
    width: '100%',
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
  },
  inputIcon: {
    fontSize: 20,
    color: '#888',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#888',
  },
  disabledInput: {
    backgroundColor: '#e9ecef',
  },
  submitButton: {
    backgroundColor: '#f87b1b',
    borderRadius: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  signInText: {
    fontSize: 16,
    color: '#f87b1b',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    marginLeft: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    margin: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  flag: {
    width: 30,
    height: 20,
    marginRight: 15,
  },
  countryName: {
    fontSize: 16,
  },
  cityItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cityName: {
    fontSize: 16,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
