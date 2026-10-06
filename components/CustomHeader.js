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
  // overlay: flota sobre el contenido (foto a sangre). transparent: sin fondo
  // sólido (cristal/blur sobre la foto). Para cabeceras sobre imágenes.
  transparent = false,
  overlay = false,
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

  // Las pantallas ya vienen envueltas en SafeAreaView: el header se estira
  // hacia arriba (margen negativo) y reserva el espacio con padding, para
  // que el fondo llegue al borde superior integrado con la barra de estado.
  const topInset = insets.top || 0;

  // Colores del cristal según modo
  const isDark = darkMode;
  const glassBg = isDark ? 'rgba(14, 14, 18, 0.82)' : 'rgba(252, 252, 255, 0.82)';
  const glassBorder = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.95)';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // El wrapper externo maneja el safe-area y el fondo glass.
        // Las pantallas ya no reservan borde superior (edges sin 'top'):
        // el header nace en y=0 y su paddingTop despeja los iconos.
        // overlay+transparent: flota sobre foto a sangre (cristal, sin fondo).
        wrapper: {
          borderBottomWidth: transparent ? 0 : 1,
          borderBottomColor: glassBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: transparent ? 0 : (isDark ? 0.35 : 0.10),
          shadowRadius: 12,
          elevation: transparent ? 0 : 8,
          marginTop: 0,
          paddingTop: Platform.OS === 'web' ? 0 : topInset,
          ...(overlay && Platform.OS !== 'web'
            ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }
            : {}),
          overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        },
        header: {
          height: 46,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
        },
        sideBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.07)'
            : 'rgba(0,0,0,0.05)',
        },
        // El botón derecho puede llevar icono + texto (ej. "Vaciar").
        // Con ancho fijo de 36 el texto se recortaba ("Va"). Ancho flexible.
        rightBtn: {
          minWidth: 36,
          height: 36,
          borderRadius: 18,
          paddingHorizontal: 10,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
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
          fontSize: 15,
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: colors.text.primary,
        },
        logo: {
          height: 28,
          aspectRatio: 2172 / 724,
        },
      }),
    [colors, topInset, isDark, glassBorder, transparent, overlay]
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
            source={require('../assets/header_final.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
      </View>

      {/* Lado derecho */}
      <TouchableOpacity
        style={[styles.rightBtn, !rightIcon && { opacity: 0 }]}
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
      <>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />
        <BlurView
          intensity={isDark ? 60 : 70}
          tint={isDark ? 'dark' : 'light'}
          style={styles.wrapper}
        >
          {HeaderContent}
        </BlurView>
      </>
    );
  }

  // Android / Web → semi-transparente (o flotante sobre foto)
  return (
    <>
      {Platform.OS !== 'web' && (
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />
      )}
      <View style={[styles.wrapper, !transparent && { backgroundColor: glassBg }]}>
        {HeaderContent}
      </View>
    </>
  );
};
