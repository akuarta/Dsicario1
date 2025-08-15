import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import ProductBadges from './ProductBadges';
import { useGlobalStyles } from '../hooks/useGlobalStyles';
import { formatPrice, calculateDiscountedPrice } from '../utils/api';
// import { useTheme } from 'react-native-elements';


/**
 * Enhanced Product Item Component with new API fields
 * Memoized to prevent unnecessary re-renders
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
  placeholderSource // nuevo prop
}) => {
  // const { theme: { colors, spacing, typography, borders, shadows } } = useTheme();
  const { darkMode } = useThemeMode();
  const { colors, spacing, typography, borders, shadows } = getThemeColors(darkMode);
  const globalStyles = useGlobalStyles(colors);

  const styles = StyleSheet.create({
    gridContainer: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: borders.radius.lg,
      padding: spacing.sm,
      margin: spacing.xs,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      minHeight: 220,
      maxWidth: '48%',
      width: '100%',
      ...shadows.small,
    },
    
    compactContainer: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      backgroundColor: colors.background,
      borderRadius: borders.radius.lg,
      padding: spacing.sm,
      marginBottom: spacing.md,
      ...shadows.small,
    },
    
    imageContainer: {
      position: 'relative',
      width: '100%',
      aspectRatio: 1,
      marginBottom: spacing.sm,
    },
    
    gridImage: {
      width: '100%',
      height: 150,
      borderRadius: borders.radius.md,
    },
    
    compactImage: {
      width: 80,
      height: 80,
      borderRadius: borders.radius.md,
      marginRight: spacing.sm,
    },
    
    outOfStockImage: {
      opacity: 0.5,
    },
    
    outOfStockOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: borders.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    
    outOfStockText: {
      ...typography.bodyMedium,
      color: colors.text.white,
      marginTop: spacing.xs,
    },
    
    ratingBadge: {
      position: 'absolute',
      top: spacing.xs,
      right: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borders.radius.full,
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
    },
    
    ratingText: {
      ...typography.bodySmall,
      color: colors.text.primary,
      marginLeft: 4,
    },
    
    productInfo: {
      flex: 1,
      paddingHorizontal: spacing.xs,
    },
    
    compactInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    
    categoryText: {
      ...typography.bodySmall,
      color: colors.text.secondary,
      marginBottom: 2,
    },
    
    productName: {
      ...typography.bodyMedium,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    
    compactName: {
      ...typography.bodySmall,
      fontWeight: 'bold',
      flex: 1,
      marginRight: spacing.sm,
    },
    
    subcategoryText: {
      ...typography.bodySmall,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    
    priceText: {
      ...typography.bodyLarge,
      fontWeight: 'bold',
      color: colors.primary,
    },
    
    compactPrice: {
      ...typography.bodyMedium,
      fontWeight: 'bold',
    },
    
    discountPriceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    originalPrice: {
      ...typography.bodySmall,
      color: colors.text.secondary,
      textDecorationLine: 'line-through',
      marginRight: spacing.xs,
    },
    
    compactOriginalPrice: {
      ...typography.bodyXSmall,
    },
    
    discountedPrice: {
      ...typography.bodyLarge,
      fontWeight: 'bold',
      color: colors.error,
    },
    
    badges: {
      marginTop: spacing.xs,
    },
    
    outOfStockContainer: {
      opacity: 0.7,
    },
  });
  const handlePress = () => {
    if (product.agotado) return; // Don't allow navigation if out of stock
    onPress?.(product);
  };

  // Calculate final price with discount
  const originalPrice = parseFloat(product.precio) || 0;
  const finalPrice = product.descuento > 0 
    ? calculateDiscountedPrice(originalPrice, product.descuento)
    : originalPrice;

  const renderImage = () => (
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: product.imagen }} 
        style={[
          compact ? styles.compactImage : styles.gridImage,
          imageStyle,
          product.agotado && styles.outOfStockImage,
          // Ajuste especial para el home: si placeholderSource existe, forzar tamaño grid
          placeholderSource && styles.gridImage
        ]}
        resizeMode="cover"
        defaultSource={placeholderSource || { uri: 'https://picsum.photos/300/200?random=999' }}
      />
      
      {/* Overlay for out of stock */}
      {product.agotado && (
        <View style={styles.outOfStockOverlay}>
          <FontAwesome5 name="times-circle" size={24} color={colors.text.white} />
          <Text style={styles.outOfStockText}>Agotado</Text>
        </View>
      )}
      
      {/* Rating badge on image */}
      {showRating && product.rating > 0 && !compact && (
        <View style={styles.ratingBadge}>
          <FontAwesome5 name="star" size={10} color={colors.accent} solid />
          <Text style={styles.ratingText}>{product.rating}</Text>
        </View>
      )}
    </View>
  );

  const renderPriceInfo = () => (
    <View style={styles.priceContainer}>
      {product.descuento > 0 ? (
        <View style={styles.discountPriceContainer}>
          <Text style={[styles.originalPrice, compact && styles.compactOriginalPrice]}>
            {formatPrice(originalPrice)}
          </Text>
          <Text style={[styles.discountedPrice, compact && styles.compactPrice]}>
            {formatPrice(finalPrice)}
          </Text>
        </View>
      ) : (
        <Text style={[styles.priceText, compact && styles.compactPrice]}>
          {formatPrice(finalPrice)}
        </Text>
      )}
    </View>
  );

  const renderProductInfo = () => (
    <View style={[styles.productInfo, compact && styles.compactProductInfo]}>
      {showCategory && product.categoria && !compact && (
        <Text style={styles.categoryText} numberOfLines={1}>
          {product.categoria}
        </Text>
      )}
      
      <Text 
        style={[
          styles.productName, 
          compact && styles.compactName,
          product.agotado && styles.outOfStockText
        ]} 
        numberOfLines={compact ? 1 : 2}
      >
        {product.nombre}
      </Text>
      
      {product.subcategoria && !compact && (
        <Text style={styles.subcategoryText} numberOfLines={1}>
          {product.subcategoria}
        </Text>
      )}
      
      {renderPriceInfo()}
      
      {showBadges && (
        <ProductBadges 
          product={product} 
          size={compact ? 'small' : 'small'}
          maxBadges={compact ? 2 : 3}
          style={styles.badges}
        />
      )}
    </View>
  );

  const renderCompactLayout = () => (
    <TouchableOpacity 
      style={[
        styles.compactContainer, 
        style,
        product.agotado && styles.outOfStockContainer
      ]}
      onPress={handlePress}
      activeOpacity={product.agotado ? 1 : 0.7}
      disabled={product.agotado}
    >
      {renderImage()}
      <View style={styles.compactInfo}>
        {renderProductInfo()}
      </View>
      {!product.agotado && (
        <FontAwesome5 
          name="chevron-right" 
          size={16} 
          color={colors.text.light} 
        />
      )}
    </TouchableOpacity>
  );

  const renderGridLayout = () => (
    <TouchableOpacity 
      style={[
        styles.gridContainer, 
        style,
        product.agotado && styles.outOfStockContainer
      ]}
      onPress={handlePress}
      activeOpacity={product.agotado ? 1 : 0.7}
      disabled={product.agotado}
    >
      {renderImage()}
      {renderProductInfo()}
    </TouchableOpacity>
  );

  return compact ? renderCompactLayout() : renderGridLayout();
});

// Display name for debugging
ProductItem.displayName = 'ProductItem';

const styles = StyleSheet.create({
  gridContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borders.radius.lg,
    padding: spacing.sm,
    margin: spacing.xs,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 220,
    maxWidth: '48%',
    width: '100%',
    ...theme.shadows.small,
  },
  
  compactContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
    borderRadius: borders.radius.lg,
    width: 160,
    minHeight: 220,
    maxWidth: 180,
    ...theme.shadows.small,
  },
  
  outOfStockContainer: {
    opacity: 0.6,
    backgroundColor: colors.surface,
  },
  
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  
  gridImage: {
    width: '100%',
    height: 140,
    borderRadius: borders.radius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.border,
  },
  
  compactImage: {
    width: 60,
    height: 60,
    borderRadius: borders.radius.sm,
    marginRight: spacing.md,
  },
  
  outOfStockImage: {
    opacity: 0.5,
  },
  
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borders.radius.md,
  },
  
  outOfStockText: {
    color: colors.text.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs / 2,
  },
  
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borders.radius.sm,
  },
  
  ratingText: {
    color: colors.text.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginLeft: 2,
  },
  
  compactInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  
  productInfo: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  
  compactProductInfo: {
    alignItems: 'flex-start',
    width: '100%',
  },
  
  categoryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  
  productName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  
  compactName: {
    textAlign: 'left',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  
  subcategoryText: {
    fontSize: typography.sizes.xs,
    color: colors.text.light,
    textAlign: 'left',
    marginBottom: spacing.xs,
  },
  
  priceContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  
  discountPriceContainer: {
    alignItems: 'center',
  },
  
  priceText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  
  compactPrice: {
    fontSize: typography.sizes.sm,
  },
  
  originalPrice: {
    fontSize: typography.sizes.sm,
    color: colors.text.light,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  
  compactOriginalPrice: {
    fontSize: typography.sizes.xs,
  },
  
  discountedPrice: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.error,
  },
  
  badges: {
    marginTop: spacing.xs,
  },
  itemContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 8,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: colors.border,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: colors.text.primary,
  },
  price: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '600',
  },
  badgesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    marginTop: 2,
    alignItems: 'center',
  },
});

export default ProductItem;