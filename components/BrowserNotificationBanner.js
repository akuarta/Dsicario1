import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import NotificationService from '../utils/notificationService';
import { showAlert } from '../utils/showAlert';

const DISMISS_KEY = '@dsicario_notif_banner_dismissed';

export const BrowserNotificationBanner = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const [visible, setVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-150)); // Empezar fuera de la pantalla (arriba)
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Solo aplica para plataforma Web
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const checkPermissionAndDismissState = async () => {
      // Si el permiso ya está concedido o denegado, no mostrar nada
      if (window.Notification.permission !== 'default') {
        return;
      }

      try {
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
        // Si el usuario ya lo cerró en las últimas 24 horas, no molestar
        if (dismissed) {
          const dismissTime = parseInt(dismissed);
          const now = Date.now();
          if (now - dismissTime < 24 * 60 * 60 * 1000) {
            return;
          }
        }

        // Mostrar banner con animación suave
        setVisible(true);
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 20,
            duration: 800,
            useNativeDriver: false
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false
          })
        ]).start();
      } catch (e) {
        console.warn('[BannerNotif] Error leyendo dismiss state:', e);
      }
    };

    // Darle un pequeño delay al inicio para no entorpecer la carga inicial
    const timeout = setTimeout(checkPermissionAndDismissState, 2500);
    return () => clearTimeout(timeout);
  }, []);

  const handleDismiss = async () => {
    // Guardar marca de tiempo de cierre
    try {
      await AsyncStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch(e) {}

    // Animar salida
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 500,
        useNativeDriver: false
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false
      })
    ]).start(() => setVisible(false));
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await NotificationService.requestWebPermission();
      if (granted) {
        // Enviar una notificación local de bienvenida inmediata para confirmar
        await NotificationService.sendLocalNotification(
          '🔔 ¡Notificaciones Activas!',
          'Excelente, ahora recibirás alertas de tus pedidos en tiempo real en este navegador.'
        );
        // Ocultar banner
        handleDismiss();
      } else {
        showAlert(
          'Aviso',
          'Las notificaciones no fueron habilitadas. Puedes activarlas haciendo clic en el candado de la barra de direcciones del navegador.'
        );
        handleDismiss();
      }
    } catch (error) {
      console.error('[BannerNotif] Error solicitando permisos:', error);
      handleDismiss();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.outerContainer, 
        { 
          top: slideAnim,
          opacity: opacityAnim,
          backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: colors.primary + '40',
        }
      ]}
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <FontAwesome5 name="bell" size={18} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text.primary }]}>¡Activa las Alertas en Tiempo Real! 🚀</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Habilita las notificaciones en este navegador para no perderte las confirmaciones de tus pedidos, avisos de cocina y el rastreo de tu delivery.
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
          <Ionicons name="close" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]} 
          onPress={handleDismiss}
        >
          <Text style={[styles.buttonText, { color: colors.text.secondary }]}>Quizás más tarde</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]} 
          onPress={handleRequestPermission}
        >
          <FontAwesome5 name="check" size={12} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={[styles.buttonText, { color: '#FFF', fontWeight: 'bold' }]}>Habilitar Notificaciones</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    zIndex: 99999,
    alignSelf: 'center',
    maxWidth: 550,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
    backdropFilter: 'blur(15px)', // Efecto Glassmorphism soportado en web
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
    // Sombras para compatibilidad nativa (React Native Web maneja boxShadow)
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  closeButton: {
    padding: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 5,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 11,
  }
});

export default BrowserNotificationBanner;
