import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  FlatList,
  SafeAreaView,
  Alert,
  TextInput
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
// SegmentedControl removido: no compatible con Android en APK nativo
import { useCart } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import { useGlobalStyles } from '../styles/globalStyles';
import theme from '../theme';
import { showAlert } from '../utils/showAlert';
import { showConfirm } from '../utils/showConfirm';
import { CustomHeader } from '../components/CustomHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { colors, spacing, typography, borders } = theme;

const CartScreen = ({ navigation }) => {
  const globalStyles = useGlobalStyles();
  const { email } = useUser();
  const { 
    cart, 
    removeFromCart, 
    updateCartItemQuantity,
    updateCartItemNote,
    clearCart, 
    getTotalCost,
    getTotalItems,
    paymentType,
    setPaymentType 
  } = useCart();

  // ID del item que tiene el input de nota abierto
  const [activeNoteId, setActiveNoteId] = useState(null);
  // Draft temporal mientras se edita (antes de confirmar con ►)
  const [draftNote, setDraftNote] = useState('');

  const NOTES_KEY = `@dsicario_product_notes_${email || 'guest'}`;

  // Al montar: recuperar notas guardadas y aplicarlas al carrito
  useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        cart.forEach(item => {
          const savedNote = saved[String(item.id)];
          if (savedNote && !item.orderNote) {
            updateCartItemNote(item.id, savedNote);
          }
        });
      })
      .catch(() => {});
  }, []);

  // Persistir notas cuando el carrito cambia
  useEffect(() => {
    const notes = {};
    cart.forEach(item => {
      if (item.orderNote && item.orderNote.trim()) {
        notes[String(item.id)] = item.orderNote.trim();
      }
    });
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes)).catch(() => {});
  }, [cart]);

  // Abrir input: carga el draft desde AsyncStorage (siempre precargado)
  const openNote = (item) => {
    AsyncStorage.getItem(NOTES_KEY)
      .then(raw => {
        const saved = raw ? JSON.parse(raw) : {};
        // Prioridad: AsyncStorage > nota actual del carrito
        const savedDraft = saved[String(item.id)] || item.orderNote || '';
        setDraftNote(savedDraft);
      })
      .catch(() => setDraftNote(item.orderNote || ''));
    setActiveNoteId(item.id);
  };

  // ► Confirmar: guarda el draft y cierra el input
  const confirmNote = (itemId) => {
    updateCartItemNote(itemId, draftNote.trim());
    setActiveNoteId(null);
  };

  // Desmarcar ✓: borra la nota del pedido Y de AsyncStorage (muere)
  const clearNote = (itemId) => {
    updateCartItemNote(itemId, '');
    setDraftNote('');
    setActiveNoteId(null);
    AsyncStorage.getItem(NOTES_KEY).then(raw => {
      const saved = raw ? JSON.parse(raw) : {};
      delete saved[String(itemId)];
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(saved)).catch(() => {});
    }).catch(() => {});
  };

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

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) {
      showAlert('Carrito vacío', 'Agrega productos al carrito antes de continuar');
      return;
    }
    navigation.navigate('Checkout', {
      cart,
      totalCost,
      paymentType,
    });
  }, [cart, totalCost, paymentType, navigation]);

  function renderCartItem({ item }) {
    const hasNote = !!(item.orderNote && item.orderNote.trim());
    const isOpen  = activeNoteId === item.id;

    return (
      <View>
        {/* Fila principal del item */}
        <View style={styles.cartItem}>
          <Image 
            source={{ uri: item.imagen }} 
            style={styles.itemImage}
            resizeMode="cover"
          />
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={2}>{item.nombre}</Text>
            <Text style={styles.itemCategory}>{item.categoria}</Text>
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
              onPress={() => handleRemoveItem(item)}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="trash" size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fila de nota — debajo del item completo */}
        <TouchableOpacity
          style={[styles.noteRow, (hasNote || isOpen) && styles.noteRowActive]}
          onPress={() => {
            if (isOpen || hasNote) {
              clearNote(item.id);
            } else {
              openNote(item);
            }
          }}
          activeOpacity={0.7}
        >
          <FontAwesome5
            name="check"
            size={10}
            color={(hasNote || isOpen) ? colors.primary : colors.text.light}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.noteRowText, (hasNote || isOpen) && styles.noteRowTextActive]}>
            {hasNote ? `Nota: ${item.orderNote}` : isOpen ? 'Toca para cancelar nota' : 'Agregar nota para cocina'}
          </Text>
        </TouchableOpacity>

        {/* Input expandible con botón ► */}
        {isOpen && (
          <View style={styles.noteInputContainer}>
            <FontAwesome5 name="utensils" size={12} color={colors.text.light} style={{ marginRight: 8, marginTop: 4 }} />
            <TextInput
              style={styles.noteInput}
              placeholder="Nota para cocina (sin cebolla, bien cocido...)"
              placeholderTextColor={colors.text.light}
              value={draftNote}
              onChangeText={setDraftNote}
              autoFocus
              multiline
              numberOfLines={2}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.noteConfirmBtn}
              onPress={() => confirmNote(item.id)}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="arrow-right" size={13} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
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
      <CustomHeader 
        title="Mi Carrito" 
        rightIcon={<Text style={{ color: colors.error, fontWeight: 'bold' }}>Vaciar</Text>}
        rightAction={cart.length > 0 ? handleClearCart : null}
      />
      <View style={styles.container}>
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
              <View style={styles.paymentToggle}>
                <TouchableOpacity
                  style={[styles.paymentOption, paymentType === 'cash' && styles.paymentOptionActive]}
                  onPress={() => setPaymentType('cash')}
                >
                  <FontAwesome5 name="money-bill-wave" size={14} color={paymentType === 'cash' ? colors.text.white : colors.text.secondary} />
                  <Text style={[styles.paymentOptionText, paymentType === 'cash' && styles.paymentOptionTextActive]}>Efectivo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentOption, paymentType === 'card' && styles.paymentOptionActive]}
                  onPress={() => setPaymentType('card')}
                >
                  <FontAwesome5 name="credit-card" size={14} color={paymentType === 'card' ? colors.text.white : colors.text.secondary} />
                  <Text style={[styles.paymentOptionText, paymentType === 'card' && styles.paymentOptionTextActive]}>Tarjeta</Text>
                </TouchableOpacity>
              </View>
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
  
  noteSection: {
    marginBottom: spacing.sm,
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    minHeight: 36,
    textAlignVertical: 'top',
  },
  noteConfirmBtn: {
    backgroundColor: colors.primary,
    width: 34,
    height: 34,
    borderRadius: borders.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
  notePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  notePreviewText: {
    flex: 1,
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.primary,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteRowActive: {
    borderTopColor: colors.primary + '44',
    backgroundColor: colors.primary + '0D',
  },
  noteRowText: {
    fontSize: 12,
    color: colors.text.light,
  },
  noteRowTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  noteToggle: {
    width: 24,
    height: 24,
    borderRadius: borders.radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  noteToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  
  paymentToggle: {
    flexDirection: 'row',
    borderRadius: borders.radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    backgroundColor: 'transparent',
  },
  paymentOptionActive: {
    backgroundColor: colors.primary,
  },
  paymentOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  paymentOptionTextActive: {
    color: colors.text.white,
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