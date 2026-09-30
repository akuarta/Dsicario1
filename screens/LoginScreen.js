import { showAlert } from '../utils/showAlert';
import React, { useState, useMemo, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { getThemeColors, spacing, borders } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import NotificationService from '../utils/notificationService';

if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: '758740272138-77lhol13d82jds53656573ijqi0u766k.apps.googleusercontent.com',
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
}

// Google Logo is now loaded from local assets for a premium, modern design

const LoginScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { signIn, signInWithGoogle, signInWithGoogleWeb, isAuthenticating } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const formHeight = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  const toggleEmailForm = () => {
    if (showEmailForm) {
      Animated.parallel([
        Animated.timing(formHeight, { toValue: 0, duration: 300, useNativeDriver: false }),
        Animated.timing(formOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start(() => setShowEmailForm(false));
    } else {
      setShowEmailForm(true);
      Animated.parallel([
        Animated.timing(formHeight, { toValue: 235, duration: 350, useNativeDriver: false }),
        Animated.timing(formOpacity, { toValue: 1, duration: 350, useNativeDriver: false }),
      ]).start();
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { showAlert('Atención', 'Por favor ingresa tus credenciales'); return; }
    if (Platform.OS === 'web') { try { await NotificationService.requestPermissions(); } catch (e) {} }
    try { await signIn(email, password); } catch (err) { console.log('Login Error:', err.message); }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web') {
      try { await NotificationService.requestPermissions(); } catch (e) {}
      try { await signInWithGoogleWeb(); } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') showAlert('Error', 'Hubo un problema al iniciar sesión con Google.');
      }
      return;
    }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      try { await GoogleSignin.signOut(); } catch (e) {}
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || response.idToken;
      if (idToken) await signInWithGoogle(idToken);
    } catch (error) {
      if (error.code !== 'status_codes.SIGN_IN_CANCELLED') showAlert('Error', 'No se pudo completar el inicio de sesión con Google.');
    }
  };

  const isDark = darkMode;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0F0F0F' : '#F7F7F7' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={{
              width: 100, height: 100, borderRadius: 28,
              overflow: 'hidden',
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 12,
            }}>
              <Image source={require('../assets/logo.png')} style={{ width: 100, height: 100 }} resizeMode="cover" />
            </View>
          </View>
          <Text style={{ fontSize: 36, fontWeight: '900', color: colors.primary, textAlign: 'center', letterSpacing: 4, marginBottom: 6 }}>
            DSICARIO
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? '#888' : '#999', textAlign: 'center', letterSpacing: 1, marginBottom: 36 }}>
            Sabor que impone su ley
          </Text>

          {/* ─── BOTÓN GOOGLE (protagonista) ─── */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isAuthenticating}
            activeOpacity={0.92}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFF',
              borderRadius: 20,
              paddingVertical: 0,
              height: 68,
              paddingHorizontal: 20,
              marginBottom: 16,
              // Sombra pronunciada estilo card
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.45 : 0.12,
              shadowRadius: 16,
              elevation: 10,
              // Borde sutil multicolor
              borderWidth: 0,
            }}
          >
            {isAuthenticating ? (
              <ActivityIndicator color="#4285F4" style={{ flex: 1 }} />
            ) : (
              <>
                {/* Logo Google moderno y destacado */}
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: '#FFF',
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <Image 
                    source={require('../assets/google-logo.png')} 
                    style={{ width: 32, height: 32 }} 
                    resizeMode="contain" 
                  />
                </View>

                {/* Texto */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F1F1F', letterSpacing: 0.2 }}>
                    Continuar con Google
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 2, fontWeight: '500' }}>
                    Acceso instantáneo con un toque
                  </Text>
                </View>

                {/* Flecha */}
                <View style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: '#F1F3F4',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <FontAwesome5 name="arrow-right" size={14} color="#4285F4" />
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* ── Separador ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#2A2A2A' : '#E5E5E5' }} />
            <Text style={{ marginHorizontal: 14, color: isDark ? '#555' : '#AAA', fontSize: 13 }}>o</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#2A2A2A' : '#E5E5E5' }} />
          </View>

          {/* ── Toggle email ── */}
          <TouchableOpacity
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              height: 54, borderRadius: 16,
              borderWidth: 1.5,
              borderColor: isDark ? '#2A2A2A' : '#E5E5E5',
              backgroundColor: isDark ? '#1A1A1A' : '#FFF',
              marginBottom: 8,
            }}
            onPress={toggleEmailForm}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="envelope" size={16} color={colors.primary} />
            <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: '600', color: isDark ? '#EEE' : '#222' }}>
              {showEmailForm ? 'Ocultar inicio con correo' : 'Iniciar sesión con correo'}
            </Text>
            <FontAwesome5
              name={showEmailForm ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={isDark ? '#555' : '#BBB'}
              style={{ marginLeft: 10 }}
            />
          </TouchableOpacity>

          {/* ── Formulario email animado ── */}
          <Animated.View style={{ overflow: 'hidden', height: formHeight, opacity: formOpacity }}>
            <View style={{ paddingTop: 10 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: isDark ? '#1A1A1A' : '#FFF',
                borderRadius: 14, paddingHorizontal: 16, height: 52,
                borderWidth: 1, borderColor: isDark ? '#2A2A2A' : '#E5E5E5',
                marginBottom: 10,
              }}>
                <FontAwesome5 name="envelope" size={16} color={colors.primary} />
                <TextInput
                  style={{ flex: 1, color: isDark ? '#EEE' : '#222', marginLeft: 12, fontSize: 15 }}
                  placeholder="Email"
                  placeholderTextColor={isDark ? '#555' : '#BBB'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: isDark ? '#1A1A1A' : '#FFF',
                borderRadius: 14, paddingHorizontal: 16, height: 52,
                borderWidth: 1, borderColor: isDark ? '#2A2A2A' : '#E5E5E5',
                marginBottom: 12,
              }}>
                <FontAwesome5 name="lock" size={16} color={colors.primary} />
                <TextInput
                  style={{ flex: 1, color: isDark ? '#EEE' : '#222', marginLeft: 12, fontSize: 15 }}
                  placeholder="Contraseña"
                  placeholderTextColor={isDark ? '#555' : '#BBB'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={16} color={isDark ? '#555' : '#BBB'} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{ height: 52, borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}
                onPress={handleLogin}
                disabled={isAuthenticating}
              >
                <LinearGradient colors={[colors.primary, '#C0001A']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {isAuthenticating
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 1 }}>INICIAR SESIÓN</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Registro ── */}
          <TouchableOpacity style={{ marginTop: 28, alignItems: 'center' }} onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: isDark ? '#666' : '#AAA', fontSize: 14 }}>
              ¿No tienes cuenta?{'  '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Regístrate aquí</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
