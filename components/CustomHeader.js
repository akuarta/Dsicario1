import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Menu, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrder } from '../contexts/OrderContext';

/**
 * CustomHeader — Glassmorphism DSicario Edition.
 *
 * Props:
 *   title       → Texto del título (opcional, usa businessInfo.name como fallback)
 *   showBack    → Forzar botón de regreso (null = auto)
 *   leftAction  → Callback personalizado para el lado izquierdo
 *   leftIcon    → 'menu' | 'arrow-left' | ReactNode
 *   rightAction → Callback para icono derecho
 *   rightIcon   → ReactNode para el lado derecho
 */
export const CustomHeader = ({
  title,
  showBack = null,
  leftAction = null,
  leftIcon = null,
  rightAction = null,
  rightIcon = null,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, darkMode } = useTheme();
  const { businessInfo } = useOrder();

  const headerTitle = title || businessInfo?.name || 'DSicario';
  const logoUrl = businessInfo?.logo;
  const canGoBack = navigation.canGoBack();

  const resolvedShowBack =
    leftAction !== null ? true : showBack !== null ? showBack : canGoBack;

  // Padding superior robusto (iOS notch, Android statusbar, web)
  const topPad =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight ?? 24
      : 20;

  // Colores del cristal según modo
  const isDark = darkMode;
  const glassBg = isDark ? 'rgba(14, 14, 18, 0.82)' : 'rgba(252, 252, 255, 0.82)';
  const glassBorder = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.95)';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // El wrapper externo maneja el safe-area y el fondo glass
        wrapper: {
          borderBottomWidth: 1,
          borderBottomColor: glassBorder,
          // Sombra profunda para elevar el header
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.45 : 0.14,
          shadowRadius: 18,
          elevation: 12,
          paddingTop: topPad,
          // Overflow oculto para blur nativo en iOS
          overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
          // backdrop-filter para web
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        },
        header: {
          height: 58,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingBottom: 4,
        },
        sideBtn: {
          width: 42,
          height: 42,
          borderRadius: 21,
          justifyContent: 'center',
          alignItems: 'center',
          // Fondo muy sutil para que el botón resalte sin saturar
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.07)'
            : 'rgba(0,0,0,0.05)',
        },
        titleContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        titleText: {
          fontSize: 16,
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: colors.text.primary,
        },
        logo: {
          width: 130,
          height: 34,
        },
      }),
    [colors, topPad, isDark, glassBorder]
  );

  const handleLeftPress = () => {
    if (leftAction) {
      leftAction();
    } else if (resolvedShowBack && canGoBack) {
      navigation.goBack();
    } else {
      try { navigation.openDrawer(); } catch (_) {}
    }
  };

  const renderLeftIcon = () => {
    const iconSize = 22;
    const iconColor = colors.text.primary;

    if (leftIcon) {
      if (leftIcon === 'menu') return <Menu size={iconSize} color={iconColor} strokeWidth={2.2} />;
      if (leftIcon === 'arrow-left') return <ArrowLeft size={iconSize} color={iconColor} strokeWidth={2.2} />;
      return leftIcon;
    }
    return resolvedShowBack
      ? <ArrowLeft size={iconSize} color={iconColor} strokeWidth={2.2} />
      : <Menu size={iconSize} color={iconColor} strokeWidth={2.2} />;
  };

  const HeaderContent = (
    <View style={styles.header}>
      {/* Lado izquierdo */}
      <TouchableOpacity style={styles.sideBtn} onPress={handleLeftPress} activeOpacity={0.7}>
        {renderLeftIcon()}
      </TouchableOpacity>

      {/* Título / Logo central */}
      <View style={styles.titleContainer}>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
        ) : (
          <Image
            source={
              isDark
                ? require('../assets/header_dark.png')
                : require('../assets/header.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
        )}
      </View>

      {/* Lado derecho */}
      <TouchableOpacity
        style={[styles.sideBtn, !rightIcon && { opacity: 0 }]}
        onPress={rightAction || undefined}
        disabled={!rightAction}
        activeOpacity={0.7}
      >
        {rightIcon || null}
      </TouchableOpacity>
    </View>
  );

  // iOS → BlurView real
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={isDark ? 60 : 70}
        tint={isDark ? 'dark' : 'light'}
        style={styles.wrapper}
      >
        {HeaderContent}
      </BlurView>
    );
  }

  // Android / Web → semi-transparente
  return (
    <View style={[styles.wrapper, { backgroundColor: glassBg }]}>
      {HeaderContent}
    </View>
  );
};
