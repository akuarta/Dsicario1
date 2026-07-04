import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Platform, Animated
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@dsicario_onboarding_seen';

export const hasSeenOnboarding = async () => {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val === 'true';
  } catch { return false; }
};

export const markOnboardingSeen = async () => {
  try { await AsyncStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
};

const STEPS = [
  {
    icon: 'store',
    iconColor: '#FF6B35',
    title: 'Bienvenido a DSicario',
    subtitle: 'Tu restaurante favorito ahora en tu bolsillo.',
    description: 'Explora nuestro menú, haz pedidos y recíbelos donde quieras.',
    tips: ['Navega por categorías', 'Busca productos específicos', 'Guarda tus favoritos'],
  },
  {
    icon: 'shopping-cart',
    iconColor: '#4CAF50',
    title: 'Agrega al Carrito',
    subtitle: 'Selecciona lo que quieras y personalízalo.',
    description: 'Puedes añadir notas especiales, elegir cantidades y mezclar productos.',
    tips: ['Toca el producto para ver detalles', 'Agrega notas al cocina', 'Modifica cantidades fácilmente'],
  },
  {
    icon: 'credit-card',
    iconColor: '#2196F3',
    title: 'Elige tu Forma de Pago',
    subtitle: 'Efectivo, transferencia o tarjeta.',
    description: 'Paga como prefieras. Si eliges transferencia, adjunta tu comprobante.',
    tips: ['Efectivo con cambio', 'Transferencia bancaria', 'Pago contra entrega'],
  },
  {
    icon: 'motorcycle',
    iconColor: '#FF9800',
    title: 'Elige tu Repartidor',
    subtitle: 'Selecciona quién te lo lleva.',
    description: 'Elige entre los repartidores disponibles. Cada uno tiene su propia reputación y nivel.',
    tips: ['Mira la reputación del repartidor', 'Puedes rechazar y esperar otro', 'El repartidor acepta o rechaza'],
  },
  {
    icon: 'route',
    iconColor: '#9C27B0',
    title: 'Rastrea tu Pedido',
    subtitle: 'Sigue tu pedido en tiempo real.',
    description: 'Ve el mapa con la ubicación del repartidor. Cuando llegue, escanea el QR para confirmar.',
    tips: ['Mapa en tiempo real', ' ETA estimado', 'Escanea el QR al recibir'],
  },
  {
    icon: 'star',
    iconColor: '#FFD700',
    title: 'Califica y Gana Niveles',
    subtitle: 'Tu opinión nos ayuda a mejorar.',
    description: 'Después de cada entrega, califica tu experiencia. Acumula puntos y sube de nivel.',
    tips: ['Califica rápido o omite', 'Las 5 estrellas son para servicio excepcional', 'Gana insignias especiales'],
  },
];

const OnboardingTutorial = ({ onComplete }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const [step, setStep] = useState(0);
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const goNext = () => {
    if (isLast) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        markOnboardingSeen();
        onComplete?.();
      });
      return;
    }
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(s => s + 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const goBack = () => {
    if (step === 0) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(s => s - 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const skip = () => {
    markOnboardingSeen();
    onComplete?.();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* Skip button */}
        {!isLast && (
          <TouchableOpacity style={styles.skipArea} onPress={skip}>
            <Text style={[styles.skipText, { color: colors.text?.light || '#999' }]}>Saltar</Text>
          </TouchableOpacity>
        )}

        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: current.iconColor + '18' }]}>
          <FontAwesome5 name={current.icon} size={52} color={current.iconColor} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text?.primary || '#333' }]}>{current.title}</Text>
        <Text style={[styles.subtitle, { color: current.iconColor }]}>{current.subtitle}</Text>
        <Text style={[styles.description, { color: colors.text?.secondary || '#666' }]}>{current.description}</Text>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          {current.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <FontAwesome5 name="check-circle" size={14} color={current.iconColor} />
              <Text style={[styles.tipText, { color: colors.text?.secondary || '#666' }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === step ? current.iconColor : (colors.text?.disabled || '#DDD'),
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {step > 0 && (
            <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border || '#DDD' }]} onPress={goBack}>
              <FontAwesome5 name="arrow-left" size={16} color={colors.text?.primary || '#333'} />
              <Text style={[styles.backBtnText, { color: colors.text?.primary || '#333' }]}>Atrás</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: current.iconColor }, !isLast && { flex: 1 }]}
            onPress={goNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? '¡Empezar!' : 'Siguiente'}
            </Text>
            {!isLast && <FontAwesome5 name="arrow-right" size={16} color="#FFF" style={{ marginLeft: 8 }} />}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 10, paddingBottom: 20, justifyContent: 'center' },
  skipArea: { position: 'absolute', top: 10, right: 0, padding: 8, zIndex: 10 },
  skipText: { fontSize: 14, fontWeight: '500' },

  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  description: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 20 },

  tipsContainer: { marginBottom: 24, gap: 10 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { fontSize: 13, flex: 1 },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },

  buttonRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1,
  },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, borderRadius: 12,
  },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default OnboardingTutorial;
