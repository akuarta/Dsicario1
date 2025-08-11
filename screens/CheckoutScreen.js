import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCart } from '../contexts/AppContext';
import globalStyles from '../styles/globalStyles';
import theme from '../theme';

function showConfirm(title, message, onConfirm) {
  if (typeof window !== 'undefined' && window.confirm) {
    const confirmed = window.confirm(`${title}\n${message}`);
    if (confirmed) onConfirm();
  } else {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: onConfirm }
      ]
    );
  }
}

const { colors, spacing, typography, borders } = theme;

const CheckoutScreen = ({ navigation, route }) => {
  const { cart, totalCost, paymentType } = route.params;
  const { clearCart } = useCart();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  // Simular procesamiento de pago
  const processPayment = useCallback(async () => {
    setIsProcessing(true);
    
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsProcessing(false);
    setOrderCompleted(true);
    
    // Limpiar carrito después del pago exitoso
    clearCart();
  }, [clearCart]);

  // Manejar confirmación de compra
  const handleConfirmPurchase = useCallback(() => {
  showConfirm(
    'Confirmar compra',
    `¿Confirmas tu compra por RD$${totalCost.toFixed(2)} con ${paymentType === 'cash' ? 'efectivo' : 'tarjeta'}?`,
    processPayment
  );
}, [totalCost, paymentType, processPayment]);


  // Volver al inicio
  const handleBackToHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Inicio' }],
    });
  }, [navigation]);

  // Renderizar resumen del pedido
  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Resumen del Pedido</Text>
      {cart.map((item, index) => (
        <View key={index} style={styles.orderItem}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text style={styles.itemQuantity}>
            x{item.quantity}
          </Text>
          <Text style={styles.itemTotal}>
            RD${(parseFloat(item.precio || 0) * item.quantity).toFixed(2)}
          </Text>
        </View>
      ))}
      
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalAmount}>
          RD${totalCost.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  // Renderizar información de pago
  const renderPaymentInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Método de Pago</Text>
      <View style={styles.paymentMethod}>
        <FontAwesome5 
          name={paymentType === 'cash' ? 'money-bill-wave' : 'credit-card'} 
          size={24} 
          color={colors.primary} 
        />
        <Text style={styles.paymentText}>
          {paymentType === 'cash' ? 'Pago en Efectivo' : 'Pago con Tarjeta'}
        </Text>
      </View>
    </View>
  );

  // Renderizar pantalla de procesamiento
  if (isProcessing) {
    return (
      <SafeAreaView style={globalStyles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.processingText}>
          Procesando tu compra...
        </Text>
        <Text style={styles.processingSubtext}>
          Por favor espera un momento
        </Text>
      </SafeAreaView>
    );
  }

  // Renderizar pantalla de éxito
  if (orderCompleted) {
    return (
      <SafeAreaView style={globalStyles.centerContainer}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <FontAwesome5 name="check" size={48} color={colors.text.white} />
          </View>
          
          <Text style={styles.successTitle}>
            ¡Compra Exitosa!
          </Text>
          
          <Text style={styles.successMessage}>
            Tu pedido ha sido procesado correctamente.
            Recibirás una confirmación por email.
          </Text>
          
          <View style={styles.orderDetails}>
            <Text style={styles.orderNumber}>
              Orden #DS{Date.now().toString().slice(-6)}
            </Text>
            <Text style={styles.orderTotal}>
              Total: RD${totalCost.toFixed(2)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToHome}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="home" size={18} color={colors.text.white} />
            <Text style={styles.backButtonText}>
              Volver al Inicio
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Renderizar pantalla de checkout
  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finalizar Compra</Text>
          <Text style={styles.headerSubtitle}>
            Revisa tu pedido antes de confirmar
          </Text>
        </View>

        {/* Resumen del pedido */}
        {renderOrderSummary()}

        {/* Información de pago */}
        {renderPaymentInfo()}

        {/* Información adicional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Entrega</Text>
          <View style={styles.infoRow}>
            <FontAwesome5 name="clock" size={16} color={colors.text.light} />
            <Text style={styles.infoText}>
              Tiempo estimado: 30-45 minutos
            </Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="map-marker-alt" size={16} color={colors.text.light} />
            <Text style={styles.infoText}>
              Entrega a domicilio disponible
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer con botón de confirmación */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmPurchase}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="credit-card" size={20} color={colors.text.white} />
          <Text style={styles.confirmButtonText}>
            Confirmar Compra - RD${totalCost.toFixed(2)}
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
  
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  headerSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  section: {
    backgroundColor: colors.background,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borders.radius.lg,
    ...theme.shadows.small,
  },
  
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  itemName: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  
  itemQuantity: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginRight: spacing.md,
  },
  
  itemTotal: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  
  totalLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  
  totalAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borders.radius.md,
  },
  
  paymentText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  infoText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  
  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  confirmButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    ...theme.shadows.medium,
  },
  
  confirmButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.white,
    marginLeft: spacing.sm,
  },
  
  processingText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  
  processingSubtext: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  successContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  successTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  successMessage: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  
  orderDetails: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  
  orderNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  
  orderTotal: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  backButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.lg,
    ...theme.shadows.medium,
  },
  
  backButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.white,
    marginLeft: spacing.sm,
  },
});

export default CheckoutScreen;
