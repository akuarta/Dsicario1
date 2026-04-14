import React, { useState, useEffect } from 'react';
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
  SafeAreaView,
  Dimensions,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

const LoginScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { signIn, signInWithGoogle, isAuthenticating, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Generamos el redirectUri directamente
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'dsicario',
  });

  // Configuración de Google Auth (Envuelto en try-catch por si falla en Web)
  let googleRequest = null;
  let googleResponse = null;
  let googlePromptAsync = () => Alert.alert('Error', 'Google Login no disponible en este entorno.');

  try {
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
      clientId: '758740272138-77lhol13d82jds53656573ijqi0u766k.apps.googleusercontent.com',
      webClientId: '758740272138-77lhol13d82jds53656573ijqi0u766k.apps.googleusercontent.com',
      androidClientId: '758740272138-dasbir8hjp2ffvs50nmm0t9mldo992i8.apps.googleusercontent.com',
      redirectUri: redirectUri,
    });
    
    googleRequest = request;
    googleResponse = response;
    googlePromptAsync = promptAsync;
  } catch (e) {
    console.warn('Google Auth Hook error:', e.message);
  }

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      signInWithGoogle(id_token);
    }
  }, [googleResponse]);

  const handleLogin = async () => {
    if (!email || !password) {
       Alert.alert('Atención', 'Por favor ingresa tus credenciales');
       return;
    }
    try {
      console.log('--- INTENTO DE LOGIN ---');
      console.log('Email:', email);
      const result = await signIn(email, password);
      console.log('Login exitoso en Interfaz para:', result.email);
    } catch (err) {
      console.log('--- ERROR DE LOGIN EN INTERFAZ ---');
      console.log('Mensaje:', err.message);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.xl,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    logo: {
      width: 100,
      height: 100,
      borderRadius: 20,
    },
    title: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xxl,
    },
    inputCard: {
      backgroundColor: colors.surface,
      borderRadius: borders.radius.xl,
      padding: spacing.lg,
      ...shadows.medium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputContainer: {
      marginBottom: spacing.md,
    },
    inputField: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: borders.radius.md,
      paddingHorizontal: spacing.md,
      height: 55,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      color: colors.text.primary,
      marginLeft: spacing.sm,
    },
    loginButton: {
      height: 55,
      borderRadius: borders.radius.md,
      overflow: 'hidden',
      marginTop: spacing.md,
    },
    gradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 18,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 55,
      borderRadius: borders.radius.md,
      borderWidth: 1,
      borderColor: '#DDD',
      backgroundColor: '#FFF',
      marginTop: spacing.xl,
    },
    googleText: {
      marginLeft: 10,
      color: '#555',
      fontWeight: 'bold',
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.logoContainer}>
            {/* Logo simplificado para evitar error 500 de assets */}
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
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

          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={() => googlePromptAsync()}
            disabled={!googleRequest}
          >
            <FontAwesome5 name="google" size={18} color="#EA4335" />
            <Text style={styles.googleText}>Continuar con Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{marginTop: 30, alignItems: 'center'}}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={{color: colors.text.secondary}}>
              ¿No tienes cuenta? <Text style={{color: colors.primary, fontWeight: 'bold'}}>Regístrate aquí</Text>
            </Text>
          </TouchableOpacity>

          <View style={{marginTop: 40, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8}}>
            <Text style={{fontSize: 12, color: 'red', fontWeight: 'bold', textAlign: 'center'}}>
              AÑADE ESTA URL EN GOOGLE CLOUD:
            </Text>
            <Text style={{fontSize: 10, color: '#333', textAlign: 'center', marginTop: 4}} selectable={true}>
              {redirectUri}
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
