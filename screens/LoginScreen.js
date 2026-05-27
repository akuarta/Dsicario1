import { showAlert } from '../utils/showAlert';
import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: '758740272138-77lhol13d82jds53656573ijqi0u766k.apps.googleusercontent.com',
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
}

const LoginScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { signIn, signInWithGoogle, signInWithGoogleWeb, isAuthenticating } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, justifyContent: 'center', padding: spacing.xl },
    logoContainer: { alignItems: 'center', marginBottom: spacing.xxl },
    logo: { width: 100, height: 100, borderRadius: 20 },
    title: { fontSize: 36, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: spacing.xs },
    subtitle: { fontSize: 16, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.xxl },
    inputCard: { backgroundColor: colors.surface, borderRadius: borders.radius.xl, padding: spacing.lg, ...shadows.medium, borderWidth: 1, borderColor: colors.border },
    inputContainer: { marginBottom: spacing.md },
    inputField: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: borders.radius.md, paddingHorizontal: spacing.md, height: 55, borderWidth: 1, borderColor: colors.border },
    input: { flex: 1, color: colors.text.primary, marginLeft: spacing.sm },
    loginButton: { height: 55, borderRadius: borders.radius.md, overflow: 'hidden', marginTop: spacing.md },
    gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
    googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginTop: spacing.xl },
    googleText: { marginLeft: 10, color: colors.text.primary, fontWeight: 'bold' },
    registerPrompt: { marginTop: 30, alignItems: 'center' },
    registerLink: { color: colors.primary, fontWeight: 'bold' }
  }), [colors, darkMode]);

  const handleLogin = async () => {
    if (!email || !password) {
       showAlert('Atención', 'Por favor ingresa tus credenciales');
       return;
    }
    try {
      await signIn(email, password);
    } catch (err) {
      console.log('Login Error:', err.message);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web') {
      try {
        await signInWithGoogleWeb();
      } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
          showAlert('Error', 'Hubo un problema al iniciar sesión con Google.');
        }
      }
      return;
    }
    
    // Flujo Nativo (Android/iOS)
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Forzamos la limpieza de cualquier sesión previa para que SIEMPRE muestre el selector de cuentas
      // Esto soluciona el glitch de "Continuar como..." -> "Elegir cuenta"
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignorar si no había sesión
      }

      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || response.idToken;
      
      if (idToken) {
        await signInWithGoogle(idToken);
      }
    } catch (error) {
      console.log('Google Native Error:', error);
      if (error.code !== 'status_codes.SIGN_IN_CANCELLED') {
        showAlert('Error', 'No se pudo completar el inicio de sesión con Google.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>DSICARIO</Text>
          <Text style={styles.subtitle}>Sabor que impone su ley</Text>
          <View style={styles.inputCard}>
            <View style={styles.inputContainer}>
              <View style={styles.inputField}>
                <FontAwesome5 name="envelope" size={18} color={colors.primary} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Email" 
                  placeholderTextColor={colors.text.light} 
                  value={email} 
                  onChangeText={setEmail} 
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.inputField}>
                <FontAwesome5 name="lock" size={18} color={colors.primary} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Contraseña" 
                  placeholderTextColor={colors.text.light} 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                   <FontAwesome5 name={showPassword ? "eye-slash" : "eye"} size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isAuthenticating}>
              <LinearGradient colors={[colors.primary, '#D62828']} style={styles.gradient}>
                {isAuthenticating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>INICIAR SESIÓN</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={isAuthenticating}>
            <FontAwesome5 name="google" size={18} color="#EA4335" />
            <Text style={styles.googleText}>Continuar con Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerPrompt} onPress={() => navigation.navigate('Register')}>
            <Text style={{color: colors.text.secondary}}>¿No tienes cuenta? <Text style={styles.registerLink}>Regístrate aquí</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
