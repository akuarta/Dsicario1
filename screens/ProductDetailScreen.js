import React, { useState, useEffect, useCallback } from 'react';
import { 
  View,
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button } from 'react-native-elements';
import { useCart } from '../contexts/AppContext';
import globalStyles from '../styles/globalStyles';
import theme from '../theme';
import { showAlert } from '../utils/showAlert';
import { showConfirm } from '../utils/showConfirm';
import { formatPrice, calculateDiscountedPrice } from '../utils/api';
import ProductBadges from '../components/ProductBadges';
import { CustomHeader } from '../components/CustomHeader';
import { AirbnbRating } from '@rneui/themed';

const { colors, spacing, typography, borders } = theme;

const ProductDetailScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const { addToCart } = useCart();
  
  const [quantity, setQuantity] = useState(1);
  const [subtotal, setSubtotal] = useState(0);
  const [orderNote, setOrderNote] = useState('');
  const [rating, setRating] = useState(5); 

  // 🎨 ESTADOS PARA LÓGICA TRICOLOR (ROJO -> GRIS -> NARANJA)
  const [lastAddedValues, setLastAddedValues] = useState({ quantity: 0, note: null });
  const [hasAddedOnce, setHasAddedOnce] = useState(false);

  const originalPrice = parseFloat(product.precio || 0);
  const finalPrice = product.descuento > 0 
    ? calculateDiscountedPrice(originalPrice, product.descuento)
    : originalPrice;

  // Calcular subtotal cuando cambie la cantidad
  useEffect(() => {
    setSubtotal(finalPrice * quantity);
  }, [quantity, finalPrice]);

  // Determinar estado actual de la acción
  const isMatchWithLastAdded = hasAddedOnce && 
                               quantity === lastAddedValues.quantity && 
                               orderNote === lastAddedValues.note;
  
  const isUpdateMode = hasAddedOnce && !isMatchWithLastAdded;

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
      subtotal,
      orderNote,
      rating 
    };
    
    addToCart(productWithQuantity);
    
    // Registrar lo último añadido para activar lógica tricolor
    setLastAddedValues({ quantity, note: orderNote });
    setHasAddedOnce(true);
    
    showAlert(
      isUpdateMode ? 'Pedido actualizado' : 'Producto agregado',
      `${product.nombre} ha sido ${isUpdateMode ? 'actualizado' : 'agregado'} en el carrito`,
      [
        { text: 'Seguir comprando', style: 'cancel' },
        { 
          text: 'Ver carrito', 
          onPress: () => navigation.navigate('Carrito')
        }
      ]
    );
  }, [product, quantity, subtotal, orderNote, addToCart, navigation, isUpdateMode]);
  return (
    <SafeAreaView style={globalStyles.container}>
      <CustomHeader title="Detalles del Producto" showBack={true} />
      
      <ScrollView style={styles.scrollHeight} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
            <View style={styles.categoryRow}>
              <Text style={styles.categoryText}>
                {product.categoria}
              </Text>
              {product.subcategoria ? (
                <Text style={[styles.categoryText, { color: colors.text.secondary, marginLeft: spacing.sm }]}>
                  • {product.subcategoria}
                </Text>
              ) : null}
            </View>
            <Text style={styles.productTitle}>
              {product.nombre}
            </Text>
            
            <View style={styles.priceContainer}>
              {product.descuento > 0 ? (
                <View style={styles.discountPriceContainer}>
                  <Text style={[styles.originalPrice, { color: colors.text.light }]}>
                    {formatPrice(originalPrice)}
                  </Text>
                  <Text style={[styles.priceText, { color: colors.error }]}>
                    {formatPrice(finalPrice)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.priceText}>
                  {formatPrice(finalPrice)}
                </Text>
              )}
            </View>
            <View style={{ marginTop: spacing.sm, alignItems: 'center' }}>
              <ProductBadges product={product} size="large" />
            </View>
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
        </View>
      </ScrollView>

      {/* Caja Fija de Comentario y Boton Agg */}
      <View style={styles.fixedFooter}>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>Califica este producto</Text>
          <AirbnbRating
            count={5}
            defaultRating={rating}
            size={20}
            showRating={false}
            onFinishRating={setRating}
            selectedColor={colors.warning}
            unSelectedColor={colors.border}
          />
        </View>
        
        <TextInput
          style={styles.noteInput}
          placeholder="Comentarios o Valoración: Ej. Bien cocida..."
          placeholderTextColor={colors.text.light}
          value={orderNote}
          onChangeText={setOrderNote}
          multiline
          numberOfLines={2}
        />
        <TouchableOpacity 
          style={[
            styles.addToCartButton,
            isMatchWithLastAdded && { backgroundColor: '#999' },
            isUpdateMode && { backgroundColor: '#FFA500' }
          ]}
          onPress={handleAddToCart}
          activeOpacity={0.8}
          disabled={isMatchWithLastAdded}
        >
          <FontAwesome5 
            name={isMatchWithLastAdded ? "check-circle" : (isUpdateMode ? "sync-alt" : "shopping-cart")} 
            size={20} 
            color={colors.text.white} 
          />
          <Text style={styles.addToCartText}>
            {isMatchWithLastAdded ? 'Agregado' : (isUpdateMode ? 'Actualizar pedido' : 'Agregar al Carrito')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollHeight: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160, // Espacio extra para que el scroll llegue al final sin que el footer tape el contenido
  },
  fixedFooter: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
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
    paddingBottom: 150, // Espacio para la caja fija
  },
  
  headerInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  categoryText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  
  productTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  
  priceContainer: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  
  discountPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  originalPrice: {
    fontSize: typography.sizes.md,
    textDecorationLine: 'line-through',
    marginRight: spacing.sm,
    fontWeight: typography.weights.medium,
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
  
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  
  ratingLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  
  noteInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borders.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    height: 50,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
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
