// Product Item Component - DSicario Branding
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// import ProductBadges from './ProductBadges'; // Eliminado por limpieza de componentes huérfanos
import { useGlobalStyles } from '../hooks/useGlobalStyles';
import { useCart } from '../contexts/AppContext';
import { formatPrice, calculateDiscountedPrice } from '../utils/api';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';

/**
 * Enhanced Product Item Component with independent tab styles
 */
const ProductItem = memo(({
  product,
  onPress,
  style,
  showCategory = true,
  showBadges = true,
  showRating = true,
  imageStyle,
  compact = false,
  placeholderSource
}) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { cart, addToCart, updateCartItemQuantity } = useCart();
  
  const originalPrice = parseFloat(product.precio) || 0;
  const finalPrice = product.descuento > 0 
    ? calculateDiscountedPrice(originalPrice, product.descuento)
    : originalPrice;

  const handlePress = () => {
    if (product.agotado) return;
    onPress?.(product);
  };

  const styles = StyleSheet.create({
    /* =========================================
       GRILLA (EXPLORAR) - Adaptativo en Columnas
       ========================================= */
    gridCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borders.radius.lg,
      margin: spacing.xs,
      overflow: 'hidden',
      ...shadows.medium,
      maxWidth: Platform.OS === 'web' ? 240 : undefined,
    },
    gridImageContainer: {
      width: '100%',
      aspectRatio: 1,
      position: 'relative',
    },

    /* =========================================
       CARRUSEL (INICIO) - Tamaos estrictos fijos
       ========================================= */
    compactCard: {
      width: 180,
      marginRight: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borders.radius.lg,
      overflow: 'hidden',
      ...shadows.medium,
    },
    compactImageContainer: {
      width: 180,
      height: 180, // Explicit height solves horizontal flex collapse
      position: 'relative',
    },

    /* =========================================
       ESTILOS COMPARTIDOS
       ========================================= */
    image: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.background,
    },
    gradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%', 
      justifyContent: 'flex-end',
      padding: spacing.sm,
    },
    productName: {
      ...typography.bodyMedium,
      fontWeight: 'bold',
      color: '#FFFFFF',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
      lineHeight: 20,
    },
    topLeftBadges: {
      position: 'absolute',
      top: 6,
      left: 6,
      zIndex: 10,
    },
    topRightBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: borders.radius.full,
      paddingHorizontal: 8,
      paddingVertical: 4,
      zIndex: 10,
    },
    ratingText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginLeft: 4,
    },
    outOfStockContainer: {
      opacity: 0.8,
    },
    outOfStockImage: {
      opacity: 0.5,
    },
    outOfStockOverlay: {
      position: 'absolute',
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    outOfStockText: {
      color: '#DDDDDD',
    },
    infoContainer: {
      padding: spacing.sm,
      paddingTop: spacing.xs,
      backgroundColor: colors.surface,
    },
    categoryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    categoryText: {
      fontSize: 10,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    subcategoryText: {
      fontSize: 9,
      color: colors.text.light,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      height: 24, // Fix height so all cards align nicely
    },
    priceText: {
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    discountPriceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    originalPrice: {
      fontSize: 12,
      textDecorationLine: 'line-through',
      marginRight: spacing.xs,
      fontWeight: '500',
    },
    discountedPrice: {
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
  });

  // Reusable blocks for both layouts
  const renderSharedImageContent = () => (
    <>
      <Image 
        source={product.imagen ? { uri: product.imagen } : require('../assets/logo.png')}
        style={[
          styles.image, 
          imageStyle, 
          product.agotado && styles.outOfStockImage,
          !product.imagen && { opacity: 0.8 }
        ]}
        defaultSource={placeholderSource || { uri: 'https://picsum.photos/300/200?random=999' }}
      />
      {/* Badges eliminados por limpieza de componentes huérfanos */}
      {/* {showBadges && (
        <View style={styles.topLeftBadges}>
          <ProductBadges product={product} size="micro" maxBadges={3} />
        </View>
      )} */}
      {showRating && product.rating > 0 && (
        <View style={styles.topRightBadge}>
          <FontAwesome5 name="star" size={8} color={colors.accent} solid />
          <Text style={styles.ratingText}>{product.rating}</Text>
        </View>
      )}
      {product.agotado && (
        <View style={styles.outOfStockOverlay}>
          <FontAwesome5 name="times-circle" size={24} color="rgba(255,255,255,0.7)" />
        </View>
      )}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.gradient}>
        <Text style={[styles.productName, product.agotado && styles.outOfStockText, { paddingRight: 35 }]} numberOfLines={2}>
          {product.nombre}
        </Text>
      </LinearGradient>
      {!product.agotado && (
        <TouchableOpacity 
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: colors.primary,
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 20,
            ...shadows.medium,
          }}
          onPress={(e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            const cartItem = cart?.find(item => item.id === product.id);
            if (cartItem) {
              updateCartItemQuantity(product.id, cartItem.quantity + 1);
            } else {
              addToCart(product);
            }
          }}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="plus" size={14} color="#FFF" />
        </TouchableOpacity>
      )}
    </>
  );

  const renderSharedInfoContent = () => (
    <View style={styles.infoContainer}>
      <View style={styles.categoryRow}>
         <View style={{ flex: 1 }}>
            {showCategory && product.categoria && (
              <Text style={[styles.categoryText, { color: colors.text.secondary }]} numberOfLines={1}>
                {product.categoria}
              </Text>
            )}
         </View>
         <View style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 4 }}>
            {product.subcategoria && (
              <Text style={styles.subcategoryText} numberOfLines={1}>
                {product.subcategoria}
              </Text>
            )}
         </View>
      </View>
      <View style={styles.priceContainer}>
        {product.descuento > 0 ? (
          <View style={styles.discountPriceContainer}>
            <Text style={[styles.originalPrice, { color: colors.text.light }]}>
              {formatPrice(originalPrice)}
            </Text>
            <Text style={[styles.discountedPrice, { color: colors.accent }]}>
              {formatPrice(finalPrice)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.priceText, { color: colors.primary }]}>
            {formatPrice(finalPrice)}
          </Text>
        )}
      </View>
    </View>
  );

  /* Layout 1: Carrusel Horizontal (Inicio) */
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, product.agotado && styles.outOfStockContainer, style]}
        activeOpacity={product.agotado ? 1 : 0.8}
        onPress={handlePress}
        disabled={product.agotado}
      >
        <View style={styles.compactImageContainer}>
          {renderSharedImageContent()}
        </View>
        {renderSharedInfoContent()}
      </TouchableOpacity>
    );
  }

  /* Layout 2: Grilla Flexible (Explorar) */
  return (
    <TouchableOpacity
      style={[styles.gridCard, product.agotado && styles.outOfStockContainer, style]}
      activeOpacity={product.agotado ? 1 : 0.8}
      onPress={handlePress}
      disabled={product.agotado}
    >
      <View style={styles.gridImageContainer}>
        {renderSharedImageContent()}
      </View>
      {renderSharedInfoContent()}
    </TouchableOpacity>
  );
});

ProductItem.displayName = 'ProductItem';

export default ProductItem;