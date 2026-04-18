import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, StatusBar } from 'react-native';
import { Menu, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrder } from '../contexts/OrderContext';

/**
 * CustomHeader — Estilo idéntico al de TallerApp.
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
    leftAction !== null
      ? true
      : showBack !== null
      ? showBack
      : canGoBack;

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      borderBottomWidth: 1,
      elevation: 4,
      paddingTop: insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight : 20),
      paddingBottom: 5,
      backgroundColor: colors.card,
      borderBottomColor: colors.border,
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
      color: colors.text.primary,
    },
    logo: {
      width: 120,
      height: 35,
    },
  }), [colors, insets.top]);

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
    const iconSize = 24;
    const iconColor = colors.text.primary;

    if (leftIcon) {
      if (leftIcon === 'menu') return <Menu size={iconSize} color={iconColor} />;
      if (leftIcon === 'arrow-left') return <ArrowLeft size={iconSize} color={iconColor} />;
      return leftIcon;
    }
    return resolvedShowBack
      ? <ArrowLeft size={iconSize} color={iconColor} />
      : <Menu size={iconSize} color={iconColor} />;
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.sideBtn} onPress={handleLeftPress}>
          {renderLeftIcon()}
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {headerTitle}
            </Text>
          )}
        </View>

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
