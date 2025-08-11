import React, { useMemo, useCallback, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  FlatList,
  SafeAreaView,
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useCart } from '../contexts/AppContext';
import globalStyles from '../styles/globalStyles';
import theme from '../theme';
import { showAlert } from '../utils/showAlert';
import { showConfirm } from '../utils/showConfirm';

const { colors, spacing, typography, borders } = theme;

const CartScreen = ({ navigation }) => {
  const { 
    cart, 
    removeFromCart, 
    updateCartItemQuantity, 
    clearCart, 
    getTotalCost,
    getTotalItems,
    paymentType,
    setPaymentType 
  } = useCart();

  const [selectedProductId, setSelectedProductId] = useState(null);

  const totalCost = useMemo(() => getTotalCost(), [cart, getTotalCost]);
  const totalItems = useMemo(() => getTotalItems(), [cart, getTotalItems]);

  // Manejar cambio de tipo de pago
  const handlePaymentTypeChange = useCallback((event) => {
    const selectedIndex = event.nativeEvent.selectedSegmentIndex;
    setPaymentType(selectedIndex === 0 ? 'cash' : 'card');
  }, [setPaymentType]);

  // Incrementar cantidad
  const incrementQuantity = useCallback((item) => {
    updateCartItemQuantity(item.id, item.quantity + 1);
  }, [updateCartItemQuantity]);

  // Decrementar cantidad
  const decrementQuantity = useCallback((item) => {
    if (item.quantity > 1) {
      updateCartItemQuantity(item.id, item.quantity - 1);
    } else {
      handleRemoveItem(item);
    }
  }, [updateCartItemQuantity]);

  // Remover item del carrito
  function handleRemoveItem(item) {
    const productId = item.id;
    const productName = item.nombre;
    const productQty = item.quantity;
    const productPrice = item.precio;
    console.log('LOG BOTÓN BORRAR:', productId, productName);
    console.log('LOG CANTIDAD:', productQty);
    console.log('LOG PRECIO:', productPrice);

    showConfirm(
      'Remover producto',
      `¿Estás seguro de que quieres remover ${productName} del carrito?`,
      () => {
        console.log('Alerta: confirmado borrar', productId, productName);
        removeFromCart(productId);
      }
    );
  }

  // Limpiar carrito
  const handleClearCart = useCallback(() => {
    showConfirm(
      'Vaciar carrito',
      '¿Estás seguro de que quieres vaciar todo el carrito?',
      clearCart
    );
  }, [clearCart]);

  // Proceder al checkout
  const handleCheckout = useCallback(() => {
    if (cart.length === 0) {
      showAlert('Carrito vacío', 'Agrega productos al carrito antes de continuar');
      return;
    }
    
    navigation.navigate('Checkout', {
      cart,
      totalCost,
      paymentType
    });
  }, [cart, totalCost, paymentType, navigation]);

  // Renderizar item del carrito
  function renderCartItem({ item }) {
    return (
      <View style={styles.cartItem}>
        <Image 
          source={{ uri: item.imagen }} 
          style={styles.itemImage}
          resizeMode="cover"
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.nombre}
          </Text>
          <Text style={styles.itemCategory}>
            {item.categoria}
          </Text>
          <Text style={styles.itemPrice}>
            RD${parseFloat(item.precio || 0).toFixed(2)} c/u
          </Text>
        </View>
        
        <View style={styles.quantityControls}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => decrementQuantity(item)}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="minus" size={12} color={colors.text.white} />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity 
            style={[styles.quantityButton, styles.incrementButton]}
            onPress={() => incrementQuantity(item)}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="plus" size={12} color={colors.text.white} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.itemActions}>
          <Text style={styles.subtotalText}>
            RD${(parseFloat(item.precio || 0) * item.quantity).toFixed(2)}
          </Text>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => {
              console.log('Botón borrar presionado para:', item.id, item.nombre);
              handleRemoveItem(item);
            }}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="trash" size={14} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Renderizar carrito vacío
  const renderEmptyCart = useCallback(() => (
    <View style={globalStyles.emptyContainer}>
      <FontAwesome5 name="shopping-cart" size={64} color={colors.text.light} />
      <Text style={globalStyles.emptyText}>Tu carrito está vacío</Text>
      <TouchableOpacity 
        style={globalStyles.primaryButton}
        onPress={() => navigation.navigate('Inicio')}
      >
        <Text style={globalStyles.primaryButtonText}>Ir de compras</Text>
      </TouchableOpacity>
    </View>
  ), [navigation]);

  // Separador de items
  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.container}>
        {/* Header del carrito */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Mi Carrito ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})
          </Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={handleClearCart}>
              <Text style={styles.clearText}>Vaciar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista del carrito */}
        <FlatList
          data={cart}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={renderEmptyCart}
          contentContainerStyle={cart.length === 0 ? styles.emptyList : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer con total y checkout */}
        {cart.length > 0 && (
          <View style={styles.footer}>
            {/* Selector de tipo de pago */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentLabel}>Método de pago:</Text>
              <SegmentedControl
                values={['Efectivo', 'Tarjeta']}
                selectedIndex={paymentType === 'cash' ? 0 : 1}
                onChange={handlePaymentTypeChange}
                style={styles.segmentedControl}
                tintColor={colors.primary}
              />
            </View>

            {/* Total y botón de checkout */}
            <View style={styles.checkoutSection}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>
                  RD${totalCost.toFixed(2)}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.checkoutButton}
                onPress={handleCheckout}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="credit-card" size={18} color={colors.text.white} />
                <Text style={styles.checkoutButtonText}>
                  Finalizar Compra
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  
  clearText: {
    fontSize: typography.sizes.md,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
  
  listContainer: {
    paddingVertical: spacing.sm,
  },
  
  emptyList: {
    flex: 1,
  },
  
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: borders.radius.sm,
    marginRight: spacing.sm,
  },
  
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  
  itemName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  itemCategory: {
    fontSize: typography.sizes.sm,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  
  itemPrice: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  
  quantityButton: {
    backgroundColor: colors.error,
    width: 28,
    height: 28,
    borderRadius: borders.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  incrementButton: {
    backgroundColor: colors.primary,
  },
  
  quantityText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginHorizontal: spacing.sm,
    minWidth: 20,
    textAlign: 'center',
  },
  
  itemActions: {
    alignItems: 'flex-end',
  },
  
  subtotalText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  
  removeButton: {
    padding: spacing.xs,
  },
  
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  paymentSection: {
    marginBottom: spacing.md,
  },
  
  paymentLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  segmentedControl: {
    height: 40,
  },
  
  checkoutSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  totalContainer: {
    flex: 1,
  },
  
  totalLabel: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  totalAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  
  checkoutButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    ...theme.shadows.medium,
  },
  
  checkoutButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.white,
    marginLeft: spacing.sm,
  },
});

export default CartScreen;