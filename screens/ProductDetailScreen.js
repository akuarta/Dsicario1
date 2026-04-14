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
import { useCart, useProducts } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import ProductItem from '../components/ProductItem';
import globalStyles from '../styles/globalStyles';
import theme from '../theme';
import { showAlert } from '../utils/showAlert';
import { showConfirm } from '../utils/showConfirm';
import { formatPrice, calculateDiscountedPrice, submitReview, fetchReviews } from '../utils/api';
import ProductBadges from '../components/ProductBadges';
import { CustomHeader } from '../components/CustomHeader';
import { AirbnbRating } from '@rneui/themed';

const { colors, spacing, typography, borders } = theme;

const ProductDetailScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const { addToCart } = useCart();
  const { products } = useProducts();
  const { username, email } = useUser();
  
  const [quantity, setQuantity] = useState(1);
  const [subtotal, setSubtotal] = useState(0);
  // Nota privada para cocina (va al carrito)
  const [kitchenNote, setKitchenNote] = useState('');
  // Reseña pública (se guarda en Google Sheets)
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(null);
  // Reseñas públicas cargadas desde Sheets
  const [publicReviews, setPublicReviews] = useState([]);

  const suggestedProducts = React.useMemo(() => {
    if (!products) return [];
    const currentId = product.id || product.ID_Producto || product.id_producto;
    return products
      .filter(p => {
        const pId = p.id || p.ID_Producto || p.id_producto;
        return p.categoria === product.categoria && pId !== currentId;
      })
      .slice(0, 3);
  }, [products, product]);

  // Cargar reseñas públicas al montar
  useEffect(() => {
    const productId = product.id || product.ID_Producto || product.id_producto;
    if (productId) {
      fetchReviews(productId)
        .then(setPublicReviews)
        .catch(() => setPublicReviews([]));
    }
  }, [product]);

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
                               kitchenNote === lastAddedValues.note;
  
  const isUpdateMode = hasAddedOnce && !isMatchWithLastAdded;

  // Incrementar cantidad
  const incrementQuantity = useCallback(() => {
    setQuantity(prev => prev + 1);
  }, []);

  // Decrementar cantidad
  const decrementQuantity = useCallback(() => {
    setQuantity(prev => prev > 1 ? prev - 1 : 1);
  }, []);

  // Agregar al carrito (usa kitchenNote, NO la reseña)
  const handleAddToCart = useCallback(() => {
    const productWithQuantity = { 
      ...product, 
      quantity,
      subtotal,
      orderNote: kitchenNote, // Nota privada de cocina
    };
    
    addToCart(productWithQuantity);
    
    setLastAddedValues({ quantity, note: kitchenNote });
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
  }, [product, quantity, subtotal, kitchenNote, addToCart, navigation, isUpdateMode]);

  // Enviar reseña pública a Google Sheets
  const handleSubmitReview = useCallback(async () => {
    if (reviewText.trim() === '') return;
    setIsSubmittingReview(true);
    try {
      const productId = product.id || product.ID_Producto || product.id_producto;
      await submitReview({
        productId,
        productName: product.nombre,
        rating: reviewRating,
        comment: reviewText.trim(),
        userName: username,
        userEmail: email,
      });
      const saved = { note: reviewText, rating: reviewRating, userName: username };
      setSubmittedReview(saved);
      setPublicReviews(prev => [{
        ID_Producto: String(productId),
        Comentario: reviewText.trim(),
        Calificacion: reviewRating,
        Usuario: username,
        Fecha: new Date().toLocaleDateString('es-DO'),
      }, ...prev]);
      setReviewText('');
    } catch (e) {
      showAlert('Error', 'No se pudo guardar la reseña. Inténtalo de nuevo.');
    } finally {
      setIsSubmittingReview(false);
    }
  }, [reviewText, reviewRating, product, username, email]);
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

          {/* Sección: Reseñas Públicas */}
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>Reseñas del Producto</Text>

            {/* Reseñas cargadas */}
            {publicReviews.length === 0 ? (
              <Text style={{ color: colors.text.light, fontStyle: 'italic', marginBottom: spacing.sm }}>
                Aún no hay reseñas. ¡Sé el primero!
              </Text>
            ) : (
              publicReviews.slice(0, 5).map((rev, i) => (
                <View key={i} style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                    <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{rev.Usuario || rev.usuario || 'Anónimo'}</Text>
                    <AirbnbRating isDisabled showRating={false} defaultRating={Number(rev.Calificacion || rev.calificacion || 5)} size={12} selectedColor={colors.warning} />
                  </View>
                  <Text style={{ color: colors.text.secondary, fontStyle: 'italic' }}>"{rev.Comentario || rev.comentario}"</Text>
                  {rev.Fecha ? <Text style={{ color: colors.text.light, fontSize: 11, marginTop: 4 }}>{rev.Fecha}</Text> : null}
                </View>
              ))
            )}

            {/* Mi reseña enviada (preview) */}
            {submittedReview && (
              <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.primary, marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Text style={{ fontWeight: 'bold', color: colors.primary }}>✓ Tu reseña fue enviada</Text>
                  <AirbnbRating isDisabled showRating={false} defaultRating={submittedReview.rating} size={12} selectedColor={colors.warning} />
                </View>
                <Text style={{ color: colors.text.secondary, fontStyle: 'italic' }}>"{submittedReview.note}"</Text>
              </View>
            )}
          </View>

          {/* Productos Sugeridos */}
          {suggestedProducts.length > 0 && (
            <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
              <Text style={styles.sectionTitle}>También te podría gustar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.sm, paddingHorizontal: 2 }}>
                {suggestedProducts.map(p => (
                  <View key={p.id || p.ID_Producto} style={{ width: 160, marginRight: spacing.md }}>
                    <ProductItem
                      product={p}
                      compact={true}
                      onPress={() => navigation.push('ProductDetail', { product: p })}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Caja Fija: Reseña Pública + Nota de Cocina + Botón */}
      <View style={styles.fixedFooter}>

        {/* --- Reseña Pública --- */}
        {!submittedReview && (
          <View>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Califica este producto</Text>
              <AirbnbRating
                count={5}
                defaultRating={reviewRating}
                size={20}
                showRating={false}
                onFinishRating={setReviewRating}
                selectedColor={colors.warning}
                unSelectedColor={colors.border}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <TextInput
                style={[styles.noteInput, { flex: 1, marginBottom: 0 }]}
                placeholder="Reseña pública: ¿Cómo estuvo? (lo verán todos)"
                placeholderTextColor={colors.text.light}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity 
                style={{ padding: spacing.md, paddingHorizontal: 18, marginLeft: spacing.sm, backgroundColor: colors.primary, borderRadius: borders.radius.md, flexDirection: 'row', alignItems: 'center', opacity: reviewText.trim() !== '' && !isSubmittingReview ? 1 : 0.5 }}
                onPress={handleSubmitReview}
                disabled={reviewText.trim() === '' || isSubmittingReview}
              >
                <FontAwesome5 name={isSubmittingReview ? 'spinner' : 'paper-plane'} size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- Nota para Cocina (privada, va al carrito) --- */}
        <TextInput
          style={[styles.noteInput, { marginBottom: spacing.sm }]}
          placeholder="Nota para cocina (ej: sin cebolla, bien cocida...)"
          placeholderTextColor={colors.text.light}
          value={kitchenNote}
          onChangeText={setKitchenNote}
          multiline
          numberOfLines={2}
        />

        {/* --- Botón Agregar al Carrito --- */}
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
