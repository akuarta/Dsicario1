import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  TextInput,
  Switch
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCart, useProducts } from '../contexts/AppContext';
import { useNavigation } from '@react-navigation/native';
import { CustomHeader } from '../components/CustomHeader';
import { useGlobalStyles } from '../styles/globalStyles';
import { generatePDFBase64 } from '../utils/pdfGenerator';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { generateInvoice } from '../utils/invoiceService';

// Eliminamos el helper externo showOrderConfirm para evitar problemas de scope
const CheckoutScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { cart = [], totalCost = 0, paymentType = 'cash', orderNote = '' } = route.params || {};
  const { clearCart, businessInfo } = useCart();
  const globalStyles = useGlobalStyles(colors);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false); // Nuevo estado para confirmación interna
  const [deliveryType, setDeliveryType] = useState('pickup'); // 'pickup' or 'delivery'
  const [orderNumber] = useState(`DS${Date.now().toString().slice(-6)}`);
  const [includePropina, setIncludePropina] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [showError, setShowError] = useState(false);

  // Cálculos de impuestos y descuentos
  const totalDiscount = cart.reduce((sum, item) => sum + (parseFloat(item.descuento || 0) * item.quantity), 0);
  const subtotal = totalCost;
  const itbis = totalCost * 0.18;
  const propina = (deliveryType === 'pickup' && includePropina) ? totalCost * 0.10 : 0;
  const finalTotal = (totalCost - totalDiscount) + itbis + propina;
  
  const numericAmountReceived = parseFloat(amountReceived) || 0;
  const devuelta = paymentType === 'cash' ? Math.max(0, numericAmountReceived - finalTotal) : 0;
  const isAmountInsufficient = paymentType === 'cash' && numericAmountReceived < finalTotal;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    section: {
      backgroundColor: colors.card || colors.surface,
      margin: spacing.md,
      padding: spacing.md,
      borderRadius: borders.radius.lg,
      ...shadows.small,
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
    taxRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: spacing.xs,
    },
    taxLabel: {
      flex: 1,
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
    },
    taxValue: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
      textAlign: 'right',
      minWidth: 100,
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
    optionContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: borders.radius.md,
      padding: spacing.xs,
      marginBottom: spacing.md,
    },
    optionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      borderRadius: borders.radius.sm,
    },
    optionButtonActive: {
      backgroundColor: colors.primary,
    },
    optionText: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.bold,
      color: colors.text.secondary,
      marginLeft: spacing.xs,
    },
    optionTextActive: {
      color: colors.text.white,
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
    footer: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      position: 'relative',
      zIndex: 999, // Super prioridad
      elevation: 10,
    },
    confirmButton: {
      backgroundColor: colors.success,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: borders.radius.lg,
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
    orderNumberText: {
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
      width: '100%',
      justifyContent: 'center',
    },
    backButtonText: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.bold,
      color: colors.text.white,
      marginLeft: spacing.sm,
    },
    printButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
      marginBottom: spacing.md,
    },
    printButtonText: {
      color: colors.primary,
    },
    // Nuevos Estilos para Efectivo
    cashInputContainer: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borders.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cashInput: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.primary,
      paddingVertical: spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
      textAlign: 'center',
    },
    changeContainer: {
      marginTop: spacing.md,
      alignItems: 'center',
    },
    changeLabel: {
      fontSize: typography.sizes.sm,
      color: colors.text.secondary,
    },
    changeValue: {
      fontSize: typography.sizes.xxl,
      fontWeight: typography.weights.bold,
      color: colors.success,
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      marginVertical: spacing.xs,
    },
  });

  const generateTicketHTML = useCallback(() => {
    const date = new Date().toLocaleString();
    const itemsHTML = cart.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>${item.nombre} x${item.quantity}</span>
        <span>RD$${(parseFloat(item.precio) * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    return `
      <html>
        <body style="font-family: 'Helvetica', sans-serif; padding: 20px; color: #333;">
          <div style="text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 20px;">
            <h1 style="margin: 0; color: #e63946;">${businessInfo.name}</h1>
            <p style="margin: 5px 0;">Ticket de Venta Oficial</p>
            <p style="font-size: 12px; color: #666;">${date}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p><strong>Orden:</strong> ${orderNumber}</p>
            <p><strong>Tipo Entrega:</strong> ${deliveryType === 'delivery' ? 'Domicilio' : 'Retiro en Local'}</p>
            <p><strong>Método Pago:</strong> ${paymentType === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
            ${orderNote ? `<p><strong>Nota:</strong> ${orderNote}</p>` : ''}
          </div>

          <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            ${itemsHTML}
          </div>

          <div style="margin-top: 10px; border-top: 2px solid #333; padding-top: 10px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 2px 0;">Subtotal:</td>
                <td style="text-align: right;">RD$${subtotal.toFixed(2)}</td>
              </tr>
              ${totalDiscount > 0 ? `
              <tr>
                <td style="padding: 2px 0; color: #d00;">Descuento:</td>
                <td style="text-align: right; color: #d00;">-RD$${totalDiscount.toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 2px 0;">ITBIS (18%):</td>
                <td style="text-align: right;">RD$${itbis.toFixed(2)}</td>
              </tr>
              ${propina > 0 ? `
              <tr>
                <td style="padding: 2px 0;">Propina:</td>
                <td style="text-align: right;">RD$${propina.toFixed(2)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 10px 0; font-size: 20px; font-weight: bold;">TOTAL:</td>
                <td style="text-align: right; font-size: 20px; font-weight: bold; color: #e63946;">RD$${finalTotal.toFixed(2)}</td>
              </tr>
              ${paymentType === 'cash' ? `
              <tr style="border-top: 1px dashed #ccc;">
                <td style="padding: 5px 0; font-size: 14px; color: #666;">Efectivo:</td>
                <td style="text-align: right; font-size: 14px; color: #666;">RD$${numericAmountReceived.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 2px 0; font-size: 18px; font-weight: bold;">Devuelta:</td>
                <td style="text-align: right; font-size: 18px; font-weight: bold; color: #2e7d32;">RD$${devuelta.toFixed(2)}</td>
              </tr>` : ''}
            </table>
          </div>

          <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #999;">
            <p>¡Gracias por su compra en DSicario!</p>
            <p>Hecho con amor 🇩🇴</p>
          </div>
        </body>
      </html>
    `;
  }, [cart, orderNumber, deliveryType, paymentType, subtotal, itbis, finalTotal]);

  const handleGenerateInvoice = async (tipo = 'factura') => {
    setIsGeneratingPDF(true);
    try {
      const orderData = {
        tipo,
        idorden: orderNumber,
        fecha: new Date().toLocaleDateString(),
        // Datos del Negocio
        NombreLocal: businessInfo.name,
        DireccionLocal: businessInfo.address,
        EmailLocal: businessInfo.email,
        TelefonoLocal: businessInfo.phone,
        logo: businessInfo.logo,
        // Datos del Cliente
        NombreUser: 'Invitado', 
        DireccionUser: deliveryType === 'delivery' ? 'Dirección en proceso' : 'Retiro en Local',
        EmailUser: 'n/a',
        TelefonoUser: 'n/a',
        metodo: paymentType === 'cash' ? 'Efectivo' : 'Tarjeta',
        items: cart.map(item => ({
          'Detalle': item.nombre,
          'Cant': item.quantity,
          'Precio': item.precio,
          'Total': (parseFloat(item.precio || 0) * item.quantity).toFixed(2)
        })),
        // Totales - Usamos nombres técnicos cortos para evitar sobreancho
        Subtotal: subtotal.toFixed(2),
        ITBIS: itbis.toFixed(2),
        Descuento: totalDiscount.toFixed(2),
        Propina: propina.toFixed(2),
        Total: finalTotal.toFixed(2),
        Pagado: paymentType === 'cash' ? numericAmountReceived.toFixed(2) : "0.00",
        Devuelta: devuelta.toFixed(2)
      };

      const success = await generateInvoice(orderData, tipo);
      if (success) {
        // Opcional: Feedback de éxito
      }
    } catch (error) {
      console.error('Error in handleGenerateInvoice:', error);
      Alert.alert('Error', 'No pudimos generar el comprobante en este momento.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const processPayment = useCallback(async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setOrderCompleted(true);
    clearCart();
  }, [clearCart]);

  const handleConfirmPurchase = () => {
    console.log('Solicitando confirmación interna...');
    setIsConfirming(true);
  };

  const executePayment = async () => {
    setIsConfirming(false);
    setIsProcessing(true);
    try {
      console.log('Procesando pago simulado...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOrderCompleted(true);
      if (clearCart) clearCart();
    } catch (error) {
      console.error('Error en pago:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  }, [navigation]);

  if (isProcessing) {
    return (
      <View style={[globalStyles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.processingText}>Enviando orden...</Text>
        <Text style={styles.processingSubtext}>Tu pedido está llegando a la cocina</Text>
      </View>
    );
  }

  if (orderCompleted) {
    return (
      <View style={[globalStyles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <FontAwesome5 name="check" size={48} color={colors.text.white} />
          </View>
          <Text style={styles.successTitle}>¡Pedido Exitoso!</Text>
          <Text style={styles.successMessage}>Tu orden ya está siendo preparada.</Text>
          
          <View style={styles.orderDetails}>
            <Text style={styles.orderNumberText}>Orden {orderNumber}</Text>
            <Text style={styles.orderTotal}>Total: RD$${finalTotal.toFixed(2)}</Text>
          </View>

          <View style={{ width: '100%', gap: spacing.md, marginVertical: spacing.md }}>
            {deliveryType === 'delivery' && (
              <TouchableOpacity 
                style={[styles.backButton, { backgroundColor: colors.primary }]} 
                onPress={() => navigation.navigate('DeliveryTracking', { orderId: orderNumber, total: finalTotal })}
              >
                <FontAwesome5 name="map-marker-alt" size={18} color={colors.text.white} />
                <Text style={styles.backButtonText}>Rastrear Pedido</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[
                styles.backButton, 
                styles.printButton,
                { opacity: isGeneratingPDF ? 0.7 : 1 }
              ]} 
              onPress={() => handleGenerateInvoice('ticket')}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <FontAwesome5 name="receipt" size={18} color={colors.primary} />
                  <Text style={[styles.backButtonText, styles.printButtonText]}>Descargar Ticket</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.backButton, 
                { 
                  backgroundColor: colors.surface, 
                  borderWidth: 1, 
                  borderColor: colors.success,
                  opacity: isGeneratingPDF ? 0.7 : 1 
                }
              ]} 
              onPress={() => handleGenerateInvoice('factura')}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <>
                  <FontAwesome5 name="file-invoice" size={18} color={colors.success} />
                  <Text style={[styles.backButtonText, { color: colors.success }]}>Factura Formal</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} 
            onPress={handleBackToHome}
          >
            <Text style={[styles.backButtonText, { color: colors.text.primary }]}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: colors.background, flex: 1 }]}>
      <CustomHeader title="Finalizar Orden" showBack={true} />
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 150 }}
        bounces={false} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Entrega</Text>
          <View style={styles.optionContainer}>
            <TouchableOpacity 
              style={[styles.optionButton, deliveryType === 'pickup' && styles.optionButtonActive]}
              onPress={() => setDeliveryType('pickup')}
            >
              <FontAwesome5 name="store" size={16} color={deliveryType === 'pickup' ? colors.text.white : colors.text.secondary} />
              <Text style={[styles.optionText, deliveryType === 'pickup' && styles.optionTextActive]}>Retiro</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.optionButton, deliveryType === 'delivery' && styles.optionButtonActive]}
              onPress={() => setDeliveryType('delivery')}
            >
              <FontAwesome5 name="motorcycle" size={16} color={deliveryType === 'delivery' ? colors.text.white : colors.text.secondary} />
              <Text style={[styles.optionText, deliveryType === 'delivery' && styles.optionTextActive]}>Delivery</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Resumen</Text>
          {cart.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Text style={styles.itemName} numberOfLines={1}>{item.nombre}</Text>
              <Text style={styles.itemQuantity}>x${item.quantity}</Text>
              <Text style={styles.itemTotal}>RD$${(parseFloat(item.precio || 0) * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          
          <View style={{ marginTop: spacing.md }}>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>Subtotal</Text>
              <Text style={styles.taxValue}>RD$${subtotal.toFixed(2)}</Text>
            </View>
            {totalDiscount > 0 && (
              <View style={styles.taxRow}>
                <Text style={[styles.taxLabel, { color: colors.error }]}>Descuento</Text>
                <Text style={[styles.taxValue, { color: colors.error }]}>-RD$${totalDiscount.toFixed(2)}</Text>
              </View>
            )}
            {propina > 0 && (
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>Propina Legal (10%)</Text>
                <Text style={styles.taxValue}>RD$${propina.toFixed(2)}</Text>
              </View>
            )}
            
            {deliveryType === 'pickup' && (
              <View style={styles.switchContainer}>
                <View>
                  <Text style={[styles.taxLabel, { color: colors.text.primary, fontWeight: 'bold' }]}>¿Aplicar Propina Legal?</Text>
                  <Text style={{ fontSize: 10, color: colors.text.secondary }}>10% obligatorio por ley para local</Text>
                </View>
                <Switch 
                  value={includePropina}
                  onValueChange={setIncludePropina}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={includePropina ? colors.text.white : '#f4f3f4'}
                />
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Final:</Text>
              <Text style={styles.totalAmount}>RD$${finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forma de Pago</Text>
          <View style={styles.paymentMethod}>
            <FontAwesome5 name={paymentType === 'cash' ? 'money-bill-wave' : 'credit-card'} size={24} color={colors.primary} />
            <Text style={styles.paymentText}>{paymentType === 'cash' ? 'Efectivo' : 'Tarjeta'}</Text>
          </View>

          {paymentType === 'cash' && (
            <View style={styles.cashInputContainer}>
              <Text style={styles.sectionTitle}>Monto Recibido</Text>
              <TextInput
                style={styles.cashInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={amountReceived}
                onChangeText={setAmountReceived}
                placeholderTextColor={colors.text.secondary}
              />
              {numericAmountReceived > 0 && (
                <View style={styles.changeContainer}>
                  <Text style={styles.changeLabel}>Su Devuelta es:</Text>
                  <Text style={styles.changeValue}>RD$${devuelta.toFixed(2)}</Text>
                  {isAmountInsufficient && (
                    <Text style={{ color: colors.error, fontSize: 12, marginTop: 5 }}>Monto insuficiente</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        {isConfirming ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity 
              style={[styles.confirmButton, { flex: 1, backgroundColor: colors.border }]} 
              onPress={() => setIsConfirming(false)}
            >
              <Text style={[styles.confirmButtonText, { color: colors.text.primary }]}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmButton, { flex: 2 }]} 
              onPress={executePayment}
            >
              <FontAwesome5 name="check" size={18} color={colors.text.white} />
              <Text style={styles.confirmButtonText}>¡Sí, Ordenar!</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.confirmButton,
              isAmountInsufficient && { backgroundColor: colors.border, opacity: 0.6 }
            ]} 
            onPress={handleConfirmPurchase}
            activeOpacity={0.8}
            disabled={isAmountInsufficient}
          >
            <Text style={styles.confirmButtonText}>
              {isAmountInsufficient ? 'Monto Insuficiente' : `Confirmar - RD$${finalTotal.toFixed(2)}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CheckoutScreen;
