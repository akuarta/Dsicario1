import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import app from '../config/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';

const auth = getAuth(app);

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Por favor ingresa correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('Main');
    } catch (e) {
      setError('Credenciales inválidas o usuario no registrado.');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError('');
    if (!email || !password) {
      setError('Por favor ingresa correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigation.replace('Main');
    } catch (e) {
      setError('No se pudo registrar. Verifica el correo o si ya existe.');
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigation.replace('Main');
      }
    });
    return unsubscribe;
  }, []);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? 'Registro' : 'Iniciar Sesión'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={styles.button}
        onPress={isRegister ? handleRegister : handleLogin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isRegister ? 'Registrarse' : 'Entrar'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.link}>{isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}</Text>
      </TouchableOpacity>
      {/* Aquí puedes agregar Google Sign-In si lo deseas */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF6B35', marginBottom: 24 },
  input: { width: '100%', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 14, alignItems: 'center', width: '100%', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  link: { color: '#FF6B35', fontWeight: 'bold', marginTop: 8, fontSize: 15 },
  error: { color: '#f44336', marginBottom: 8, fontWeight: 'bold' },
});

export default LoginScreen;