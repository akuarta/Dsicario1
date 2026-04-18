import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View,
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCart, useProducts } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import ProductItem from '../components/ProductItem';
import { showAlert } from '../utils/showAlert';
import { formatPrice, calculateDiscountedPrice, submitReview, fetchReviews } from '../utils/api';
import ProductBadges from '../components/ProductBadges';
import { CustomHeader } from '../components/CustomHeader';
import GlassPanel from '../components/GlassPanel';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';

const { width } = Dimensions.get('window');

const SimpleRating = ({ defaultRating = 5, onFinishRating, isDisabled = false, size = 20, selectedColor = '#f1c40f' }) => {
  const [rating, setRating] = useState(defaultRating);

  const handlePress = (idx) => {
    if (isDisabled) return;
    setRating(idx);
    if (onFinishRating) onFinishRating(idx);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity 
          key={star} 
          disabled={isDisabled} 
          onPress={() => handlePress(star)}
          activeOpacity={isDisabled ? 1 : 0.7}
          style={{ paddingHorizontal: 2 }}
        >
          <FontAwesome5 
            name="star" 
            solid={star <= rating} 
            size={size} 
            color={star <= rating ? selectedColor : '#DDDDDD'} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const ProductDetailScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { product } = route.params;
  const { addToCart } = useCart();
  const { products } = useProducts();
  const { username, email, isClientMode } = useUser();
  
  const [quantity, setQuantity] = useState(1);
  const [subtotal, setSubtotal] = useState(0);
  const [kitchenNote, setKitchenNote] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(null);
  const [publicReviews, setPublicReviews] = useState([]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 160 },
    fixedFooter: { 
      backgroundColor: colors.surface, 
      paddingHorizontal: spacing.md, 
      paddingTop: spacing.sm, 
      paddingBottom: spacing.lg, 
      borderTopWidth: 1, 
      borderTopColor: colors.border,
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    imageContainer: { position: 'relative', height: 300, backgroundColor: colors.surface },
    productImage: { width: '100%', height: '100%' },
    imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, justifyContent: 'flex-end', padding: spacing.md },
    priceOverlay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    subtotalOverlay: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
    contentContainer: { padding: spacing.md },
    productTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.xs },
    categoryText: { fontSize: 12, fontWeight: 'bold', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    priceText: { fontSize: 24, fontWeight: 'bold', color: colors.success },
    originalPrice: { fontSize: 16, textDecorationLine: 'line-through', color: colors.text.disabled, marginRight: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
    descriptionText: { fontSize: 15, color: colors.text.secondary, lineHeight: 22 },
    noteInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 15, color: colors.text.primary, minHeight: 60, textAlignVertical: 'top' },
    quantityControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md },
    quantityBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    quantityText: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary, marginHorizontal: 30 },
    addToCartBtn: { backgroundColor: colors.primary, height: 55, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
    addToCartText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    reviewCard: { backgroundColor: colors.background, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
    reviewUser: { fontWeight: 'bold', color: colors.text.primary, fontSize: 14 },
    reviewComment: { color: colors.text.secondary, fontStyle: 'italic', marginTop: 5 },
    reviewDate: { fontSize: 10, color: colors.text.disabled, marginTop: 5 }
  }), [colors, darkMode]);

  const suggestedProducts = useMemo(() => {
    if (!products) return [];
    const currentId = product.id || product.ID_Producto || product.id_producto;
    return products.filter(p => (p.id || p.ID_Producto || p.id_producto) !== currentId && p.categoria === product.categoria).slice(0, 4);
  }, [products, product]);

  useEffect(() => {
    const productId = product.id || product.ID_Producto || product.id_producto;
    if (productId) {
      fetchReviews(productId).then(setPublicReviews).catch(() => setPublicReviews([]));
    }
  }, [product]);

  const finalPrice = product.descuento > 0 ? calculateDiscountedPrice(product.precio, product.descuento) : product.precio;

  useEffect(() => {
    setSubtotal(finalPrice * quantity);
  }, [quantity, finalPrice]);

  const handleAddToCart = useCallback(() => {
    console.log(`[🛒 AÑADIR AL CARRITO] Botón presionado para: ${product.nombre}`);
    console.log(`- ID Producto: ${product.id || product.ID_Producto}`);
    console.log(`- Cantidad Seleccionada: ${quantity}`);
    console.log(`- Precio Unitario: $${finalPrice}`);
    console.log(`- Subtotal a registrar: $${subtotal}`);
    
    addToCart({ ...product, quantity, subtotal, orderNote: kitchenNote });
    showAlert('¡Listo!', `${product.nombre} se agregó al carrito.`);
  }, [product, quantity, subtotal, kitchenNote, addToCart, finalPrice]);

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return;
    setIsSubmittingReview(true);
    try {
      await submitReview({
        productId: product.id || product.ID_Producto,
        productName: product.nombre,
        rating: reviewRating,
        comment: reviewText.trim(),
        userName: username,
        userEmail: email
      });
      setSubmittedReview({ note: reviewText, rating: reviewRating });
      setReviewText('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la reseña');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title={product.nombre} showBack={true} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.imagen }} style={styles.productImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay}>
            <View style={styles.priceOverlay}>
              <Text style={{ color: '#FFF' }}>{quantity} unidad(es)</Text>
              <Text style={styles.subtotalOverlay}>RD${subtotal.toFixed(2)}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.categoryText}>{product.categoria}</Text>
          <Text style={styles.productTitle}>{product.nombre}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
            {product.descuento > 0 && <Text style={styles.originalPrice}>{formatPrice(product.precio)}</Text>}
            <Text style={styles.priceText}>{formatPrice(finalPrice)}</Text>
          </View>
          
          <ProductBadges product={product} size="large" />

          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.descriptionText}>{product.descripcion || 'Sin descripción disponible.'}</Text>

          <Text style={styles.sectionTitle}>Instrucciones Especiales</Text>
          <TextInput 
            style={styles.noteInput} 
            placeholder="Ej: Sin cebolla, término medio..." 
            placeholderTextColor={colors.text.disabled} 
            value={kitchenNote} 
            onChangeText={setKitchenNote} 
            multiline 
          />

          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Seleccionar Cantidad</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity style={styles.quantityBtn} onPress={() => {
                console.log(`[-] Disminuyendo cantidad de ${quantity} a ${quantity > 1 ? quantity - 1 : 1}`);
                setQuantity(q => q > 1 ? q - 1 : 1);
              }}>
                <FontAwesome5 name="minus" size={16} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity style={styles.quantityBtn} onPress={() => {
                console.log(`[+] Aumentando cantidad de ${quantity} a ${quantity + 1}`);
                setQuantity(q => q + 1);
              }}>
                <FontAwesome5 name="plus" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Reseñas ({publicReviews.length})</Text>
          {publicReviews.length === 0 ? (
            <Text style={{ color: colors.text.disabled, fontStyle: 'italic' }}>Aún no hay reseñas para este producto.</Text>
          ) : (
            publicReviews.map((rev, i) => (
              <View key={i} style={styles.reviewCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.reviewUser}>{rev.Usuario || 'Cliente'}</Text>
                  <SimpleRating isDisabled defaultRating={Number(rev.Calificacion || 5)} size={12} selectedColor={colors.warning} />
                </View>
                <Text style={styles.reviewComment}>"{rev.Comentario}"</Text>
                <Text style={styles.reviewDate}>{rev.Fecha}</Text>
              </View>
            ))
          )}

          {isClientMode && !submittedReview && (
            <View style={{ marginTop: 20, backgroundColor: colors.background, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.border }}>
              <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 10 }]}>Escribe tu Reseña</Text>
              <SimpleRating defaultRating={5} size={25} onFinishRating={setReviewRating} selectedColor={colors.warning} />
              <View style={{ flexDirection: 'row', marginTop: 15 }}>
                <TextInput style={[styles.noteInput, { flex: 1, minHeight: 50 }]} placeholder="¿Qué te pareció este producto?" placeholderTextColor={colors.text.disabled} value={reviewText} onChangeText={setReviewText} />
                <TouchableOpacity style={[styles.quantityBtn, { marginLeft: 10, width: 50, height: 50, opacity: reviewText.trim() ? 1 : 0.5 }]} disabled={!reviewText.trim() || isSubmittingReview} onPress={handleSubmitReview}>
                  <FontAwesome5 name="paper-plane" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {suggestedProducts.length > 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.sectionTitle}>También te podría gustar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
                {suggestedProducts.map((p, i) => (
                  <View key={i} style={{ width: 160, marginRight: 15 }}>
                    <ProductItem
                      product={p}
                      compact={true}
                      showCategory={false}
                      onPress={(prod) => navigation.push('ProductDetail', { product: prod })}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      <GlassPanel intensity={30} style={styles.fixedFooter}>
        {/* 🛒 Botón exclusivo para Clientes, Modo Cliente o el ADMIN */}
        {(isClientMode || role === 'Cliente' || role === 'Admin') ? (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleAddToCart}
            style={{ 
              shadowColor: colors.primary, 
              shadowOffset: { width: 0, height: 5 }, 
              shadowOpacity: 0.4, 
              shadowRadius: 10, 
              elevation: 8 
            }}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.addToCartBtn, { marginTop: 0 }]}
            >
              <FontAwesome5 name="shopping-cart" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={[styles.addToCartText, { flex: 1 }]}>Agregar</Text>
              <View style={{ 
                backgroundColor: 'rgba(255,255,255,0.25)', 
                paddingHorizontal: 16, 
                paddingVertical: 8, 
                borderRadius: 14 
              }}>
                <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>
                  ${subtotal.toFixed(2)}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ color: colors.text.secondary, fontWeight: 'bold' }}>
              Modo Personal: Consulta de Productos
            </Text>
          </View>
        )}
      </GlassPanel>
    </SafeAreaView>
  );
};

export default ProductDetailScreen;
