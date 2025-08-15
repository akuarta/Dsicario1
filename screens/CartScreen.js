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
import theme from '../theme/theme';
import { showAlert } from '../utils/showAlert';
import { showConfirm } from '../utils/showConfirm';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const { darkMode } = useThemeMode();
const colors = getThemeColors(darkMode);
const { spacing, typography, borders } = theme;

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.medium,
      backgroundColor: colors.primary,
    },
    headerTitle: {
      ...typography.h5,
      color: colors.text.white,
    },
    clearText: {
      ...typography.body2,
      color: colors.text.white,
    },
    cartItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.medium,
      backgroundColor: colors.card,
      borderBottomWidth: borders.thin,
      borderBottomColor: colors.border,
    },
    itemImage: {
      width: 80,
      height: 80,
      borderRadius: borders.radius.small,
      marginRight: spacing.medium,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      ...typography.body1,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    itemCategory: {
      ...typography.body2,
      color: colors.text.secondary,
      marginBottom: spacing.extraSmall,
    },
    itemPrice: {
      ...typography.body2,
      color: colors.text.primary,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.medium,
    },
    quantityButton: {
      backgroundColor: colors.primary,
      padding: spacing.small,
      borderRadius: borders.radius.small,
    },
    incrementButton: {
      marginLeft: spacing.extraSmall,
    },
    quantityText: {
      ...typography.body1,
      marginHorizontal: spacing.small,
      color: colors.text.primary,
    },
    itemActions: {
      marginLeft: spacing.medium,
      alignItems: 'flex-end',
    },
    subtotalText: {
      ...typography.body1,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: spacing.small,
    },
    removeButton: {
      padding: spacing.small,
    },
    summaryContainer: {
      padding: spacing.medium,
      backgroundColor: colors.card,
      borderTopWidth: borders.thin,
      borderTopColor: colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.small,
    },
    summaryLabel: {
      ...typography.body1,
      color: colors.text.primary,
    },
    summaryValue: {
      ...typography.body1,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    totalRow: {
      borderTopWidth: borders.thin,
      borderTopColor: colors.border,
      paddingTop: spacing.small,
      marginTop: spacing.small,
    },
    totalLabel: {
      ...typography.h6,
      color: colors.text.primary,
    },
    totalValue: {
      ...typography.h6,
      fontWeight: 'bold',
      color: colors.primary,
    },
    checkoutButton: {
      backgroundColor: colors.accent,
      padding: spacing.medium,
      borderRadius: borders.radius.medium,
      alignItems: 'center',
      marginTop: spacing.medium,
    },
    checkoutButtonText: {
      ...typography.button,
      color: colors.text.white,
    },
    paymentTypeContainer: {
      marginVertical: spacing.medium,
    },
    paymentTypeLabel: {
      ...typography.body1,
      color: colors.text.primary,
      marginBottom: spacing.small,
    },
    segmentedControl: {
      height: 40,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: spacing.medium,
    },
  });

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
    <SafeAreaView style={[globalStyles.container, darkMode && { backgroundColor: '#222' }]}>
      <View style={[styles.container, darkMode && { backgroundColor: '#222' }]}>
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
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCartButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  emptyCartButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 10,
    padding: 10,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  itemPrice: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 5,
  },
  itemQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  quantityButton: {
    backgroundColor: colors.border,
    padding: 5,
    borderRadius: 5,
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  itemQuantity: {
    fontSize: 14,
    marginHorizontal: 10,
    color: colors.text.primary,
  },
  removeButton: {
    padding: 5,
  },
  summaryContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 10,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  summaryTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  checkoutButtonText: {
    color: colors.text.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentTypeContainer: {
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  paymentTypeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text.primary,
  },
  // Estilos para el SegmentedControl
  segmentedControl: {
    height: 40,
  },
});

export default CartScreen;