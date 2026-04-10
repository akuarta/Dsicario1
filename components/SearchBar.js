import React, { useRef, useEffect, memo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import theme, { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

/**
 * Optimized Search Bar Component
 * Memoized to prevent unnecessary re-renders
 */
const SearchBar = React.memo(({
  value,
  onChangeText,
  onClear,
  onFilterPress,
  onMenuPress, // New prop
  placeholder = "Buscar productos...",
  style,
  autoFocus = false,
  editable = true,
  showClearButton = true,
  showFilterButton = true,
  showMenuButton = true, // New prop
}) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { spacing, typography, borders, shadows } = theme;
  
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate clear button appearance
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: value && value.length > 0 ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [value, fadeAnim]);

  const handleClear = () => {
    onClear?.();
    inputRef.current?.focus();
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: spacing.sm, // Slightly tighter
      height: 48,
      marginHorizontal: spacing.md,
      marginTop: spacing.xs,
      marginBottom: 4,
      ...shadows.small,
      borderWidth: 1,
      borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    
    menuButton: {
      padding: spacing.xs,
      marginRight: spacing.xs,
    },

    searchIcon: {
      marginHorizontal: spacing.xs,
    },
    
    input: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text.primary,
      height: '100%',
    },
    
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    clearButton: {
      padding: spacing.xs,
      marginRight: spacing.xs,
    },
    
    divider: {
      width: 1,
      height: 20,
      backgroundColor: colors.border,
      marginHorizontal: spacing.xs,
      opacity: 0.5,
    },

    filterButton: {
      padding: spacing.xs,
      marginLeft: spacing.xs,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {showMenuButton ? (
        <TouchableOpacity 
          onPress={onMenuPress}
          style={styles.menuButton}
          activeOpacity={0.7}
        >
          <FontAwesome5 
            name="bars" 
            size={16} 
            color={colors.text.secondary} 
          />
        </TouchableOpacity>
      ) : null}

      <FontAwesome5 
        name="search" 
        size={14} 
        color={colors.text.secondary} 
        style={styles.searchIcon} 
      />
      
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text.primary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        autoFocus={autoFocus}
        editable={editable}
        returnKeyType="search"
        clearButtonMode="never"
        maxLength={100}
      />
      
      <View style={styles.actions}>
        {showClearButton && value && value.length > 0 ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity 
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.6}
            >
              <FontAwesome5 
                name="times-circle" 
                size={16} 
                color={colors.text.secondary} 
                solid
              />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {showFilterButton ? (
          <>
            <View style={styles.divider} />
            <TouchableOpacity 
              onPress={onFilterPress}
              style={styles.filterButton}
              activeOpacity={0.7}
            >
              <FontAwesome5 
                name="sliders-h" 
                size={16} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
});

// Display name for debugging
SearchBar.displayName = 'SearchBar';

export default SearchBar;