import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  FlatList,
  Alert,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCart } from '../contexts/AppContext';
import { formatPrice } from '../utils/api';
import { useUser } from '../contexts/UserContext';
import { useGlobalStyles } from '../styles/globalStyles';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import theme from '../theme';
import { showAlert } from '../utils/showAlert';
import { showConfirm } from '../utils/showConfirm';
import { CustomHeader } from '../components/CustomHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const globalStyles = useGlobalStyles(colors);
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

  const [activeNoteId, setActiveNoteId] = useState(null);
  const [draftNote, setDraftNote] = useState('');
  const NOTES_KEY = `@dsicario_product_notes_${email || 'guest'}`;

  useEffect(() => {
    AsyncStorage.getItem(NOTES_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        cart.forEach(item => {
          const savedNote = saved[item.cartItemId || String(item.id)];
          if (savedNote && !item.orderNote) {
            updateCartItemNote(item.cartItemId || item.id, savedNote);
          }
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const notes = {};
    cart.forEach(item => {
      if (item.orderNote && item.orderNote.trim()) {
        notes[item.cartItemId || String(item.id)] = item.orderNote.trim();
      }
    });
    AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes)).catch(() => {});
  }, [cart]);

  const openNote = (item) => {
    const id = item.cartItemId || String(item.id);
    AsyncStorage.getItem(NOTES_KEY)
      .then(raw => {
        const saved = raw ? JSON.parse(raw) : {};
        const savedDraft = saved[id] || item.orderNote || '';
        setDraftNote(savedDraft);
      })
      .catch(() => setDraftNote(item.orderNote || ''));
    setActiveNoteId(id);
  };

  const confirmNote = (cartItemId) => {
    updateCartItemNote(cartItemId, draftNote.trim());
    setActiveNoteId(null);
  };

  const clearNote = (cartItemId) => {
    updateCartItemNote(cartItemId, '');
    setDraftNote('');
    setActiveNoteId(null);
    AsyncStorage.getItem(NOTES_KEY).then(raw => {
      const saved = raw ? JSON.parse(raw) : {};
      delete saved[cartItemId];
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(saved)).catch(() => {});
    }).catch(() => {});
  };

  const totalCost = useMemo(() => getTotalCost(), [cart, getTotalCost]);
  const totalItems = useMemo(() => getTotalItems(), [cart, getTotalItems]);

  const incrementQuantity = useCallback((item) => {
    updateCartItemQuantity(item.cartItemId, item.quantity + 1);
  }, [updateCartItemQuantity]);

  const decrementQuantity = useCallback((item) => {
    if (item.quantity > 1) {
      updateCartItemQuantity(item.cartItemId, item.quantity - 1);
    } else {
      showConfirm(
        'Remover producto',
        `¿Estás seguro de que quieres remover ${item.nombre} del carrito?`,
        () => removeFromCart(item.cartItemId)
      );
    }
  }, [updateCartItemQuantity, removeFromCart]);

  const handleRemoveItem = (item) => {
    showConfirm(
      'Remover producto',
      `¿Estás seguro de que quieres remover ${item.nombre} del carrito?`,
      () => removeFromCart(item.cartItemId)
    );
  };

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

  const styles = useMemo(() => StyleSheet.create({
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
    listContainer: {
      paddingVertical: spacing.sm,
      paddingBottom: 100,
    },
    emptyList: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cartItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: spacing.sm,
      marginHorizontal: spacing.md,
      marginVertical: spacing.xs,
      borderRadius: borders.radius.lg,
      ...shadows.small,
    },
    itemImage: {
      width: 70,
      height: 70,
      borderRadius: borders.radius.md,
      backgroundColor: colors.background,
    },
    itemInfo: {
      flex: 1,
      marginLeft: spacing.sm,
      justifyContent: 'center',
    },
    preOrderBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.primary + '40',
    },
    preOrderText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.primary,
      textTransform: 'uppercase',
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
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borders.radius.lg,
      ...shadows.medium,
    },
    checkoutButtonText: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: '#FFF',
      marginLeft: spacing.sm,
    },
    emptyStateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyStateTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.text.primary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    emptyStateText: {
      fontSize: typography.sizes.md,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    shopNowButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borders.radius.lg,
      ...shadows.medium,
    },
    shopNowButtonText: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: '#FFF',
    },
  }), [colors, darkMode]);

  function renderCartItem({ item }) {
    const hasNote = !!(item.orderNote && item.orderNote.trim());
    const itemId = item.cartItemId || String(item.id);
    const isOpen = activeNoteId === itemId;

    return (
      <View>
        <View style={styles.cartItem}>
          <Image source={{ uri: item.imagen }} style={styles.itemImage} resizeMode="cover" />
          <View style={styles.itemInfo}>
            {item.isPreOrder && (
              <View style={styles.preOrderBadge}>
                <Text style={styles.preOrderText}>Pre-Orden</Text>
              </View>
            )}
            <Text style={styles.itemName} numberOfLines={2}>{item.nombre}</Text>
            <Text style={styles.itemCategory}>{item.categoria}</Text>
            <Text style={styles.itemPrice}>{formatPrice(item.precio)} c/u</Text>
          </View>
          <View style={styles.quantityControls}>
            <TouchableOpacity style={styles.quantityButton} onPress={() => decrementQuantity(item)}>
              <FontAwesome5 name="minus" size={12} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity style={[styles.quantityButton, styles.incrementButton]} onPress={() => incrementQuantity(item)}>
              <FontAwesome5 name="plus" size={12} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.itemActions}>
            <Text style={styles.subtotalText}>{formatPrice(parseFloat(item.precio || 0) * item.quantity)}</Text>
            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveItem(item)}>
              <FontAwesome5 name="trash" size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.noteRow, (hasNote || isOpen) && styles.noteRowActive]}
          onPress={() => (isOpen || hasNote) ? clearNote(itemId) : openNote(item)}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="check" size={10} color={(hasNote || isOpen) ? colors.primary : colors.text.light} style={{ marginRight: 6 }} />
          <Text style={[styles.noteRowText, (hasNote || isOpen) && styles.noteRowTextActive]}>
            {hasNote ? `Nota: ${item.orderNote}` : isOpen ? 'Toca para cancelar nota' : 'Agregar nota para cocina'}
          </Text>
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.noteInputContainer}>
            <FontAwesome5 name="utensils" size={12} color={colors.text.light} style={{ marginRight: 8, marginTop: 4 }} />
            <TextInput
              style={styles.noteInput}
              placeholder="Nota para cocina..."
              placeholderTextColor={colors.text.light}
              value={draftNote}
              onChangeText={setDraftNote}
              autoFocus
              multiline
              numberOfLines={2}
              onSubmitEditing={() => confirmNote(itemId)}
              blurOnSubmit={true}
            />
            <TouchableOpacity style={styles.noteConfirmBtn} onPress={() => confirmNote(itemId)}>
              <FontAwesome5 name="arrow-right" size={13} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const renderEmptyCart = () => (
    <View style={globalStyles.emptyContainer}>
      <Image 
        source={require('../assets/logo.png')} 
        style={{ width: 120, height: 120, marginBottom: spacing.lg, opacity: 0.6 }} 
        resizeMode="contain" 
      />
      <Text style={globalStyles.emptyText}>Tu carrito está vacío</Text>
      <TouchableOpacity style={globalStyles.primaryButton} onPress={() => navigation.navigate('InicioTab')}>
        <Text style={globalStyles.primaryButtonText}>Ir de compras</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.container}>
      <CustomHeader 
        title={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome5 name="shopping-cart" size={18} color={colors.text.primary} style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Mi Carrito</Text>
          </View>
        }
        rightIcon={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome5 name="trash-alt" size={14} color={colors.error} style={{ marginRight: 4 }} />
            <Text style={{ color: colors.error, fontWeight: 'bold' }}>Vaciar</Text>
          </View>
        }
        rightAction={cart.length > 0 ? handleClearCart : null}
      />
      <View style={styles.container}>
        <FlatList
          data={cart}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.cartItemId || item.id?.toString() || Math.random().toString()}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmptyCart}
          contentContainerStyle={cart.length === 0 ? styles.emptyList : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        {cart.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.checkoutSection}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>{formatPrice(totalCost)}</Text>
              </View>
              <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout} activeOpacity={0.8}>
                <FontAwesome5 name="arrow-right" size={18} color="#FFF" />
                <Text style={styles.checkoutButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CartScreen;