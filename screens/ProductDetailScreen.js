import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button } from 'react-native-elements';
import { useCart } from '../contexts/AppContext';
import { useGlobalStyles } from '../hooks/useGlobalStyles';
import theme from '../theme/theme';
import { showAlert } from '../utils/showAlert';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const { darkMode } = useThemeMode(); 
const colors = getThemeColors(darkMode);
const { spacing, typography, borders } = theme;

const ProductDetailScreen = ({ navigation, route }) => {
  
  const { product } = route.params;
  const { addToCart } = useCart();
  const globalStyles = useGlobalStyles(colors);
  
  const [quantity, setQuantity] = useState(1);
  const [subtotal, setSubtotal] = useState(0);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    imageContainer: {
      position: 'relative',
      height: 250,
      backgroundColor: colors.surface,
    },
    
    productImage: {
      width: '100%',
      height: '100%',
    },
    
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    
    priceOverlay: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    
    quantityOverlay: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      color: colors.text.white,
    },
    
    subtotalOverlay: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.text.white,
    },
    
    contentContainer: {
      padding: spacing.md,
    },
    
    headerInfo: {
      marginBottom: spacing.md,
    },
    
    categoryText: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
      marginBottom: spacing.xs,
    },
    
    productTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    
    priceText: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.primary,
    },
    
    descriptionContainer: {
      marginBottom: spacing.md,
    },
    
    sectionTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    
    descriptionText: {
      fontSize: typography.sizes.md,
      color: colors.text.secondary,
      lineHeight: typography.lineHeights.md,
    },
    
    quantitySection: {
      marginBottom: spacing.lg,
    },
    
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: borders.radius.md,
      padding: spacing.xs,
    },
    
    quantityButton: {
      backgroundColor: colors.primary,
      padding: spacing.sm,
      borderRadius: borders.radius.sm,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    incrementButton: {
      marginLeft: spacing.xs,
    },
    
    quantityDisplay: {
      minWidth: 60,
      alignItems: 'center',
      marginHorizontal: spacing.sm,
    },
    
    quantityText: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.text.primary,
    },
    
    addToCartButton: {
      backgroundColor: colors.accent,
      paddingVertical: spacing.md,
      borderRadius: borders.radius.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    addToCartText: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.text.white,
      marginLeft: spacing.sm,
    },
  });

  // Calcular subtotal cuando cambie la cantidad
  useEffect(() => {
    const price = parseFloat(product.precio || 0);
    setSubtotal(price * quantity);
  }, [quantity, product.precio]);

  // Incrementar cantidad
  const incrementQuantity = useCallback(() => {
    setQuantity(prev => prev + 1);
  }, []);

  // Decrementar cantidad
  const decrementQuantity = useCallback(() => {
    setQuantity(prev => prev > 1 ? prev - 1 : 1);
  }, []);

  // Agregar al carrito
  const handleAddToCart = useCallback(() => {
    const productWithQuantity = { 
      ...product, 
      quantity,
      subtotal 
    };
    
    addToCart(productWithQuantity);
    
    showAlert(
      'Producto agregado',
      `${product.nombre} ha sido agregado al carrito`,
      [
        { text: 'Seguir comprando', style: 'cancel' },
        { 
          text: 'Ver carrito', 
          onPress: () => navigation.navigate('Carrito')
        }
      ]
    );
  }, [product, quantity, subtotal, addToCart, navigation]);

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Imagen del producto */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: product.imagen }} 
            style={styles.productImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.imageOverlay}
          >
            <View style={styles.priceOverlay}>
              <Text style={styles.quantityOverlay}>
                Cantidad: {quantity}
              </Text>
              <Text style={styles.subtotalOverlay}>
                RD${subtotal.toFixed(2)}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Información del producto */}
        <View style={styles.contentContainer}>
          <View style={styles.headerInfo}>
            <Text style={styles.categoryText}>
              {product.categoria}
            </Text>
            <Text style={styles.productTitle}>
              {product.nombre}
            </Text>
            <Text style={styles.priceText}>
              RD${parseFloat(product.precio || 0).toFixed(2)}
            </Text>
          </View>

          {/* Descripción */}
          {product.descripcion && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.descriptionText}>
                {product.descripcion}
              </Text>
            </View>
          )}

          {/* Control de cantidad */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Cantidad</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={decrementQuantity}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="minus" size={16} color={colors.text.white} />
              </TouchableOpacity>
              
              <View style={styles.quantityDisplay}>
                <Text style={styles.quantityText}>{quantity}</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.quantityButton, styles.incrementButton]}
                onPress={incrementQuantity}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="plus" size={16} color={colors.text.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón agregar al carrito */}
          <TouchableOpacity 
            style={styles.addToCartButton}
            onPress={handleAddToCart}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="shopping-cart" size={20} color={colors.text.white} />
            <Text style={styles.addToCartText}>
              Agregar al Carrito
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  imageContainer: {
    position: 'relative',
    height: 250,
    backgroundColor: colors.surface,
  },
  
  productImage: {
    width: '100%',
    height: '100%',
  },
  
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  
  priceOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  quantityOverlay: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.white,
  },
  
  subtotalOverlay: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.accent,
  },
  
  contentContainer: {
    padding: spacing.md,
  },
  
  headerInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  categoryText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  
  productTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  priceText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  
  descriptionContainer: {
    marginBottom: spacing.lg,
  },
  
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  descriptionText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  
  quantitySection: {
    marginBottom: spacing.xl,
  },
  
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  quantityButton: {
    backgroundColor: colors.error,
    width: 40,
    height: 40,
    borderRadius: borders.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  
  incrementButton: {
    backgroundColor: colors.primary,
  },
  
  quantityDisplay: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: borders.radius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  
  quantityText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  
  addToCartButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    ...theme.shadows.medium,
  },
  
  addToCartText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.white,
    marginLeft: spacing.sm,
  },
});

export default ProductDetailScreen;