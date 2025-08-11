import React, { memo, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Animated
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import theme from '../theme';

const { colors, spacing, typography, borders } = theme;

/**
 * Optimized Search Bar Component
 * Memoized to prevent unnecessary re-renders
 */
const SearchBar = memo(({ 
  value,
  onChangeText,
  onClear,
  placeholder = "Buscar productos...",
  style,
  autoFocus = false,
  editable = true,
  showClearButton = true
}) => {
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate clear button appearance
  React.useEffect(() => {
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

  const handleFocus = () => {
    // Optional: Add focus animations or effects
  };

  const handleBlur = () => {
    // Optional: Add blur animations or effects
  };

  return (
    <View style={[styles.container, style]}>
      <FontAwesome5 
        name="search" 
        size={16} 
        color={colors.text.light} 
        style={styles.searchIcon} 
      />
      
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.light}
        autoFocus={autoFocus}
        editable={editable}
        returnKeyType="search"
        clearButtonMode="never" // We handle clear button manually
        onFocus={handleFocus}
        onBlur={handleBlur}
        maxLength={100}
      />
      
      {showClearButton && value && value.length > 0 && (
        <Animated.View style={[styles.clearButtonContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.6}
          >
            <FontAwesome5 
              name="times" 
              size={14} 
              color={colors.text.light} 
            />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
});

// Display name for debugging
SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borders.radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    ...theme.shadows.small,
  },
  
  searchIcon: {
    marginRight: spacing.sm,
  },
  
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    paddingVertical: 0, // Remove default padding
  },
  
  clearButtonContainer: {
    marginLeft: spacing.sm,
  },
  
  clearButton: {
    padding: spacing.xs,
    borderRadius: borders.radius.sm,
  },
});

export default SearchBar;