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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const RegisterScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { signUp, isAuthenticating, error, clearError } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
    logoBadgeContainer: { alignItems: 'center', marginBottom: spacing.xl },
    logoImage: { width: 120, height: 120, borderRadius: 60 },
    title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
    subtitle: { fontSize: typography.sizes.md, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.xl },
    inputContainer: { marginBottom: spacing.md },
    inputLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text.primary, marginBottom: spacing.xs },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
    inputIcon: { marginRight: spacing.sm },
    input: { flex: 1, height: 50, fontSize: typography.sizes.md, color: colors.text.primary },
    passwordToggle: { padding: spacing.sm },
    errorContainer: { backgroundColor: colors.error + '15', padding: spacing.md, borderRadius: borders.radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.error + '30' },
    errorText: { color: colors.error, fontSize: typography.sizes.sm, textAlign: 'center', fontWeight: typography.weights.medium },
    button: { backgroundColor: colors.primary, borderRadius: borders.radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg, ...shadows.medium },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.text.white, fontWeight: typography.weights.bold, fontSize: typography.sizes.lg },
    loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
    loginText: { color: colors.text.secondary, fontSize: typography.sizes.md },
    loginLink: { color: colors.primary, fontWeight: typography.weights.bold, fontSize: typography.sizes.md, marginLeft: spacing.xs },
    termsText: { fontSize: typography.sizes.xs, color: colors.text.light, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 }
  }), [colors, darkMode]);

  const validateForm = () => {
    clearError();
    setLocalError('');
    if (!displayName.trim()) { setLocalError('Por favor ingresa tu nombre'); return false; }
    if (!email.trim()) { setLocalError('Por favor ingresa tu email'); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setLocalError('Por favor ingresa un email válido'); return false; }
    if (password.length < 6) { setLocalError('La contraseña debe tener al menos 6 caracteres'); return false; }
    if (password !== confirmPassword) { setLocalError('Las contraseñas no coinciden'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    try {
      await signUp(email, password, displayName.trim());
      showAlert('¡Bienvenido! 🎉', `Gracias por registrarte, ${displayName}!`);
    } catch (err) {
      console.log('Error en registro:', err.message);
      showAlert('Error de registro', err.message || 'No se pudo completar el registro. Verifica tu conexión.');
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.logoBadgeContainer}>
            <Image source={require('../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Sabor que impone su ley</Text>
          {displayError && (
            <View style={styles.errorContainer}><Text style={styles.errorText}>{displayError}</Text></View>
          )}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre completo</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="user" size={16} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Tu nombre" 
                placeholderTextColor={colors.text.light} 
                value={displayName} 
                onChangeText={setDisplayName} 
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="envelope" size={16} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="tu@email.com" 
                placeholderTextColor={colors.text.light} 
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address" 
                autoCapitalize="none"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="lock" size={16} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Mínimo 6 caracteres" 
                placeholderTextColor={colors.text.light} 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!showPassword}
                returnKeyType="next"
                blurOnSubmit={false}
              />
              <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome5 name={showPassword ? "eye-slash" : "eye"} size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirmar contraseña</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="lock" size={16} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Repite la contraseña" 
                placeholderTextColor={colors.text.light} 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>
          </View>
          <TouchableOpacity style={[styles.button, isAuthenticating && styles.buttonDisabled]} onPress={handleRegister} disabled={isAuthenticating}>
            {isAuthenticating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Crear Cuenta</Text>}
          </TouchableOpacity>
          <Text style={styles.termsText}>Al registrarte, aceptas nuestros Términos de Servicio y Política de Privacidad</Text>
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.loginLink}>Inicia sesión</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
