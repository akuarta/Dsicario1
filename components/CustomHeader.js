import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Menu, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrder } from '../contexts/OrderContext';
import { Image } from 'react-native';

/**
 * CustomHeader — Estilo idéntico al de TallerApp.
 * Props:
 *   title        — texto del header
 *   showBack     — forzar flecha de volver (null = automático)
 *   leftAction   — callback al presionar botón izquierdo
 *   leftIcon     — 'menu' | 'arrow-left' | ReactNode
 *   rightAction  — callback al presionar botón derecho
 *   rightIcon    — ReactNode para el botón derecho
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
   const { colors } = useTheme();
   const { businessInfo } = useOrder();
 
   const headerTitle = title || businessInfo?.name || 'DSicario';
   const logoUrl = businessInfo?.logo;

  const canGoBack = navigation.canGoBack();

  // Determina si mostramos flecha o menú
  const resolvedShowBack =
    leftAction !== null
      ? true
      : showBack !== null
      ? showBack
      : canGoBack;

  const handleLeftPress = () => {
    if (leftAction) {
      leftAction();
    } else if (resolvedShowBack && canGoBack) {
      navigation.goBack();
    } else {
      // Abrir drawer si no hay pila de navegación
      try {
        navigation.openDrawer();
      } catch (_) {}
    }
  };

  const renderLeftIcon = () => {
    if (leftIcon) {
      if (leftIcon === 'menu') return <Menu size={24} color={colors.text.primary} />;
      if (leftIcon === 'arrow-left') return <ArrowLeft size={24} color={colors.text.primary} />;
      return leftIcon;
    }
    return resolvedShowBack
      ? <ArrowLeft size={24} color={colors.text.primary} />
      : <Menu size={24} color={colors.text.primary} />;
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        {/* Botón izquierdo */}
        <TouchableOpacity style={styles.sideBtn} onPress={handleLeftPress}>
          {renderLeftIcon()}
        </TouchableOpacity>

        {/* Título centrado con soporte para Logo */}
        <View style={styles.titleContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
              {headerTitle}
            </Text>
          )}
        </View>

        {/* Botón derecho (opcional) */}
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={rightAction || undefined}
          disabled={!rightAction}
        >
          {rightIcon || null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    elevation: 4,
    ...Platform.select({
      web: { boxShadow: '0px 2px 3px rgba(0,0,0,0.25)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
    }),
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sideBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  logo: {
    width: 120,
    height: 35,
  },
});
