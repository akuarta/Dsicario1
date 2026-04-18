import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCart } from '../contexts/AppContext'; // 👈 Añadido
import { useUser } from '../contexts/UserContext'; // 👈 Añadido
import { getThemeColors, borders, spacing, typography, shadows } from '../theme/theme';
import ProductBadges from './ProductBadges';
import { formatPrice, calculateDiscountedPrice } from '../utils/api';

const HeroBannerItem = memo(({ product, onPress }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { addToCart } = useCart(); // 👈 Añadido
  const { role, isClientMode } = useUser(); // 🛡️ Seguridad

  const canPurchase = isClientMode || role === 'Cliente' || role === 'Admin';

  if (!product) return null;

  const originalPrice = parseFloat(product.precio) || 0;
  const finalPrice = product.descuento > 0 
    ? calculateDiscountedPrice(originalPrice, product.descuento)
    : originalPrice;

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.9} 
      onPress={() => onPress?.(product)}
    >
      <View style={[styles.innerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Image 
          source={product.imagen ? { uri: product.imagen } : require('../assets/logo.png')}
          style={[
            styles.image,
            !product.imagen && { opacity: 0.8 }
          ]}
          resizeMode="cover"
        />
        
        {/* NEW badge - exclusively for the hero banner */}
        <View style={styles.badgeTopLeft}>
          <View style={[styles.microBadge, { backgroundColor: colors.accent }]}>
            <FontAwesome5 name="star" size={8} color="#fff" />
            <Text style={styles.microBadgeText}>NUEVO</Text>
          </View>
        </View>

        <LinearGradient 
          colors={['transparent', 'rgba(0,0,0,0.95)']} 
          style={styles.gradient}
        >
          <View style={styles.content}>
            {product.categoria && (
              <Text style={styles.category} numberOfLines={1}>
                {product.categoria}
              </Text>
            )}
            
            <Text style={styles.title} numberOfLines={2}>
              {product.nombre}
            </Text>

            <View style={styles.footerRow}>
              <View style={styles.priceContainer}>
                {product.descuento > 0 ? (
                  <>
                    <Text style={styles.originalPrice}>{formatPrice(originalPrice)}</Text>
                    <Text style={[styles.discountedPrice, { color: colors.accent }]}>{formatPrice(finalPrice)}</Text>
                  </>
                ) : (
                  <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(finalPrice)}</Text>
                )}
              </View>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                   onPress={() => onPress?.(product)}
                   style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                >
                  <Text style={styles.actionText}>Ver</Text>
                </TouchableOpacity>

                {canPurchase && (
                  <TouchableOpacity 
                    onPress={(e) => {
                      if (e && e.stopPropagation) e.stopPropagation();
                      addToCart(product);
                    }}
                    style={[styles.actionButton, { backgroundColor: colors.primary, flexDirection: 'row', gap: 5 }]}
                  >
                    <FontAwesome5 name="plus" size={10} color="#fff" />
                    <Text style={styles.actionText}>Agregar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  innerContainer: {
    width: '100%',
    height: 180, // Wide standard banner height
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '80%', // Taller gradient for better text readability
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  badgeTopLeft: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 10,
  },
  microBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  microBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  content: {
    width: '100%',
  },
  category: {
    color: '#ddd',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1,
  },
  title: {
    ...typography.h5,
    color: '#ffffff',
    fontWeight: '900',
    marginBottom: spacing.sm,
    textShadow: '0px 1px 3px rgba(0, 0, 0, 0.75)',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: '900',
    textShadow: '0px 1px 2px rgba(0, 0, 0, 0.5)',
  },
  originalPrice: {
    fontSize: 12,
    color: '#aaa',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountedPrice: {
    fontSize: 20,
    fontWeight: '900',
    textShadow: '0px 1px 2px rgba(0, 0, 0, 0.5)',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: borders.radius.full,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default HeroBannerItem;
