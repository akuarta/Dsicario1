import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { 
  getAuth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { saveUser } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [transitioning, setTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState(null); // 'login' or 'logout'

  // Animaciones
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef(null);

  const startTransition = (type) => {
    setTransitionType(type);
    setTransitioning(true);

    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();

    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
    );
    spinLoop.current.start();
  };

  const endTransition = (delay = 0) => {
    setTimeout(() => {
      if (spinLoop.current) spinLoop.current.stop();
      spinAnim.setValue(0);

      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 0.85, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setTransitioning(false);
        setTransitionType(null);
      });
    }, delay);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        };
        setUser(userData);
        await AsyncStorage.setItem('@dsicario_user', JSON.stringify(userData));
      } else {
        setUser(null);
        await AsyncStorage.removeItem('@dsicario_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    if (!email || !password) {
      throw new Error('Email y contraseña son requeridos');
    }

    startTransition('login');
    setIsAuthenticating(true);
    setError(null);

    try {
      console.log('Firebase: Iniciando signInWithEmailAndPassword...');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase: Login exitoso para UID:', result.user.uid);
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || email.split('@')[0],
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };
      setUser(userData);
      await AsyncStorage.setItem('@dsicario_user', JSON.stringify(userData));
      endTransition(1200);
      return userData;
    } catch (err) {
      endTransition(100);
      console.error('Firebase Error Code:', err.code);
      console.error('Firebase Error Message:', err.message);
      let errorMessage = 'Error al iniciar sesión';
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'No existe una cuenta con este email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El email no es válido';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Error de conexión. Verifica tu internet';
          break;
        default:
          errorMessage = err.message;
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signUp = async (email, password, displayName) => {
    if (!email || !password) {
      throw new Error('Email y contraseña son requeridos');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    startTransition('login');
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }

      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName || email.split('@')[0],
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };

      console.log('[AuthContext] Registro exitoso. UserContext se encargará de la sincronización.');

      setUser(userData);
      await AsyncStorage.setItem('@dsicario_user', JSON.stringify(userData));
      endTransition(1200);
      return userData;
    } catch (err) {
      endTransition(100);
      let errorMessage = 'Error al registrarse';
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email ya está registrado';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El email no es válido';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña debe tener al menos 6 caracteres';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Error de conexión. Verifica tu internet';
          break;
        default:
          errorMessage = err.message;
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async () => {
    console.log('Cerrando sesión...');
    startTransition('logout');
    try {
      await firebaseSignOut(auth);
      setUser(null);
      await AsyncStorage.removeItem('@dsicario_user');
      console.log('Sesión cerrada exitosamente');
      endTransition(1200);
    } catch (err) {
      endTransition(100);
      console.error('Error al cerrar sesión:', err);
      throw err;
    }
  };

  const signInWithGoogle = async (idToken) => {
    startTransition('login');
    setIsAuthenticating(true);
    setError(null);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };

      setUser(userData);
      await AsyncStorage.setItem('@dsicario_user', JSON.stringify(userData));

      console.log('[AuthContext] Login Google (Native) exitoso. UserContext sincronizará el perfil.');
      endTransition(1200);
      return userData;
    } catch (err) {
      endTransition(100);
      setError(err.message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signInWithGoogleWeb = async () => {
    startTransition('login');
    setIsAuthenticating(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      };

      console.log('[AuthContext] Login Google (Web) exitoso. UserContext sincronizará el perfil.');

      setUser(userData);
      await AsyncStorage.setItem('@dsicario_user', JSON.stringify(userData));
      endTransition(1200);
      return userData;
    } catch (err) {
      endTransition(100);
      setError(err.message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticating,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGoogleWeb,
    signOut,
    clearError: () => setError(null),
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const isLoggingIn = transitionType === 'login';

  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* ── Modal de transición para Inicio/Cierre de Sesión estilo InDrive ── */}
      <Modal visible={transitioning} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={{
          flex: 1,
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: overlayOpacity,
        }}>
          <Animated.View style={{
            alignItems: 'center',
            transform: [{ scale: cardScale }],
            opacity: cardOpacity,
          }}>
            {/* Círculo animado */}
            <Animated.View style={{
              width: 140, height: 140, borderRadius: 70,
              backgroundColor: isLoggingIn ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)', // Green for login, Red for logout
              borderWidth: 2,
              borderColor: isLoggingIn ? '#22C55E88' : '#EF444488',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 32,
              transform: [{ rotate: spin }],
              // Sombra / brillo
              shadowColor: isLoggingIn ? '#22C55E' : '#EF4444',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 15,
              elevation: 10,
            }}>
              <FontAwesome5
                name={isLoggingIn ? 'sign-in-alt' : 'power-off'}
                size={54}
                color={isLoggingIn ? '#22C55E' : '#EF4444'}
              />
            </Animated.View>

            {/* Texto informativo */}
            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center', marginBottom: 8 }}>
              {isLoggingIn ? 'Iniciando' : 'Cerrando'}
            </Text>
            <Text style={{
              fontSize: 22, fontWeight: '800',
              color: isLoggingIn ? '#22C55E' : '#EF4444',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {isLoggingIn ? 'Sesión' : 'Sesión'}
            </Text>
            <Text style={{ color: '#AAA', fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 20 }}>
              {isLoggingIn 
                ? 'Conectando con DSicario, preparando tu menú...' 
                : 'Guardando tu sesión y desconectando de forma segura...'}
            </Text>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
