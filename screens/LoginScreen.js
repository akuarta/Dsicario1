import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {  getThemeColors } from '../theme/theme'; // Ajusta la ruta según tu proyecto
import { useThemeMode } from '../contexts/ThemeContext';

const { darkMode } = useThemeMode();
const colors = getThemeColors(darkMode);


const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 24
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 24
    },
    input: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
      backgroundColor: colors.surface
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      width: '100%',
      marginBottom: 12
    },
    buttonText: {
      color: colors.text.white,
      fontWeight: 'bold',
      fontSize: 18
    },
    link: {
      color: colors.primary,
      fontWeight: 'bold',
      marginTop: 8,
      fontSize: 15
    },
    error: {
      color: colors.error,
      marginBottom: 8,
      fontWeight: 'bold'
    }
  });

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Por favor, completa todos los campos');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Main');
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? 'Registrarse' : 'Iniciar Sesión'}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor={colors.text.placeholder}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={colors.text.placeholder}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={colors.text.white} />
        ) : (
          <Text style={styles.buttonText}>{isRegister ? 'Registrarse' : 'Ingresar'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.link}>
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;
