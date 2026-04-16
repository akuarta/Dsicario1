import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  StatusBar,
  TextInput,
  Switch,
  Image
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCart, useProducts, useDataSync } from '../contexts/AppContext';
import { useNavigation } from '@react-navigation/native';
import { CustomHeader } from '../components/CustomHeader';
import { useGlobalStyles } from '../styles/globalStyles';
import { generatePDFBase64 } from '../utils/pdfGenerator';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { generateInvoice } from '../utils/invoiceService';
import { useUser } from '../contexts/UserContext';
import { saveOrder, fetchDeliveries, fetchKitchenOrders } from '../utils/api';

const CheckoutScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { cart = [], totalCost = 0, paymentTypeProps = 'cash', orderNoteProps = '' } = route.params || {};
  const { clearCart, businessInfo } = useCart();
  const { user, username, email } = useUser();
  const { syncAllData } = useDataSync();
  const globalStyles = useGlobalStyles(colors);
  
  // REGION: ESTADOS DE DESPACHO EN VIVO
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [isWaitingRider, setIsWaitingRider] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [riderConfirmed, setRiderConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [amountReceived, setAmountReceived] = useState('');
  const [includePropina, setIncludePropina] = useState(true);
  const [paymentType, setPaymentType] = useState(paymentTypeProps);
  const [orderNote, setOrderNote] = useState(orderNoteProps);

  // CÃ¡lculos de impuestos y descuentos
  const totalDiscount = cart.reduce((sum, item) => sum + (parseFloat(item.descuento || 0) * item.quantity), 0);
  const subtotal = totalCost;
  const itbis = totalCost * 0.18;
  const propina = (deliveryType === 'pickup' && includePropina) ? totalCost * 0.10 : 0;
  const finalTotal = (totalCost - totalDiscount) + itbis + propina;
  
  const numericAmountReceived = parseFloat(amountReceived) || 0;
  const devuelta = paymentType === 'cash' ? Math.max(0, numericAmountReceived - finalTotal) : 0;
  const isAmountInsufficient = paymentType === 'cash' && numericAmountReceived < finalTotal;

  useEffect(() => {
    const loadRiders = async () => {
      try {
        const data = await fetchDeliveries();
        // Filtro estricto: Solo mostramos los repartidores ACTIVOS
        setRiders(data.filter(r => r.activo));
      } catch (e) {
        console.error('Error cargando repartidores:', e);
      }
    };
    loadRiders();
  }, []);

  // FunciÃ³n para enviar la propuesta en el momento de elegir
  const sendRiderProposal = async (rider) => {
    try {
      setIsProcessing(true);
      const orderId = `ORD-${Date.now()}`;
      setCurrentOrderId(orderId);
      setSelectedRider(rider);

      const orderData = {
        ID_Pedido: orderId,
        Cliente: user?.username || 'Cliente App',
        Email: user?.email || email || '',
        Pedido_Items: JSON.stringify(cart.map(item => ({
          nombre: item.nombre,
          cantidad: item.quantity,
          precio: item.precio
        }))),
        Total: finalTotal,
        Estado: rider ? 'Propuesta' : 'Listo', // Si no hay rider, va directo a Listo (Random)
        Entrada: new Date().toLocaleTimeString(),
        Fecha: new Date().toLocaleDateString(),
        ID_Mesa: '',
        Tipo: 'Domicilio',
        ID_Rider: rider?.id_delivery || '',
        Salida: '', 
        notas: '',
        whatsapp: 'Ver en Perfil',
        direccion: 'Domicilio (App)',
        metodo: paymentType === 'cash' ? 'Efectivo' : 'Tarjeta',
        usuario: user?.email || 'App User'
      };

      const result = await saveOrder(orderData);
      
      if (result && (result.success || result.status === 'success' || result.row)) {
        if (rider) {
          setIsWaitingRider(true);
          setCountdown(60);
          setRiderModalVisible(false);
        } else {
          // Es Random
          setRiderConfirmed(true);
          setRiderModalVisible(false);
          Alert.alert('Despacho Público', 'El pedido quedará libre para cualquier repartidor.');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la propuesta.');
    } finally {
      setIsProcessing(false);
    }
  };

  // LÃ³gica de monitoreo en tiempo real del repartidor
  useEffect(() => {
    let timer = null;
    let pollInterval = null;

    if (isWaitingRider && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);

      pollInterval = setInterval(async () => {
        if (!currentOrderId) return;
        try {
          const orders = await fetchKitchenOrders();
          const order = orders.find(o => String(o.id) === String(currentOrderId));
          // Si el estado cambiÃ³ a 'on_the_way' es que el repartidor aceptÃ³ en su App
          if (order && order.estado === 'on_the_way') {
            stopWaiting();
            setRiderConfirmed(true);
            Alert.alert('¡Aceptado!', `${selectedRider?.nombre} ha aceptado el pedido.`);
          }
          if (order && order.estado === 'rechazado') {
            stopWaiting();
            setSelectedRider(null);
            setRiderModalVisible(true);
            Alert.alert('Rechazado', 'El repartidor no puede tomar el pedido. Elige otro.');
          }
        } catch (e) { console.log('Polling error:', e); }
      }, 3000);
    } else if (countdown === 0 && isWaitingRider) {
      stopWaiting();
      Alert.alert('Tiempo Agotado', 'El repartidor no ha respondido. Â¿Deseas elegir otro?', [
          { text: 'Elegir Otro', onPress: () => setRiderModalVisible(true) },
          { text: 'Dejar Pendiente', onPress: () => handleFinalSuccess() }
      ]);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isWaitingRider, countdown, currentOrderId]);

  const stopWaiting = () => {
      setIsWaitingRider(false);
      setCountdown(60);
  };

  const handleFinalSuccess = () => {
    setOrderCompleted(true);
    clearCart();
    syncAllData();
  };


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
            <p><strong>Orden:</strong> ${currentOrderId || '---'}</p>
            <p><strong>Tipo Entrega:</strong> ${deliveryType === 'delivery' ? 'Domicilio' : 'Retiro en Local'}</p>
            <p><strong>MÃ©todo Pago:</strong> ${paymentType === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
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
            <p>Â¡Gracias por su compra en DSicario!</p>
            <p>Hecho con amor ðŸ‡©ðŸ‡´</p>
          </div>
        </body>
      </html>
    `;
  }, [cart, currentOrderId, deliveryType, paymentType, subtotal, itbis, finalTotal]);

  const handleGenerateInvoice = async (tipo = 'factura') => {
    setIsGeneratingPDF(true);
    try {
      const orderData = {
        tipo,
        idorden: currentOrderId || '---',
        fecha: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        // Datos del Negocio
        NombreLocal: (businessInfo && businessInfo.name) || 'D´Sicario',
        DireccionLocal: (businessInfo && businessInfo.address) || 'República Dominicana',
        EmailLocal: (businessInfo && businessInfo.email) || 'hairoman28@gmail.com',
        TelefonoLocal: (businessInfo && businessInfo.phone) || '809-000-0000',
        logo: businessInfo && businessInfo.logo,
        // Datos del Cliente
        Cliente: user?.displayName || 'Invitado', 
        DireccionUser: deliveryType === 'delivery' ? 'DirecciÃ³n en proceso' : 'Retiro en Local',
        EmailUser: user?.email || 'n/a',
        TelefonoUser: 'n/a',
        metodo: paymentType === 'cash' ? 'Efectivo' : 'Tarjeta',
        items: cart.map(item => ({
          'Detalle': item.nombre,
          'Cant': item.quantity,
          'Precio': item.precio,
          'Total': (parseFloat(item.precio || 0) * item.quantity).toFixed(2)
        })),
        // Totales
        Subtotal: subtotal.toFixed(2),
        ITBIS: itbis.toFixed(2),
        Descuento: totalDiscount.toFixed(2),
        Propina: propina.toFixed(2),
        Total: finalTotal.toFixed(2),
        Pagado: paymentType === 'cash' ? numericAmountReceived.toFixed(2) : "0.00",
        Devuelta: devuelta.toFixed(2)
      };

      let success = false;
      if (tipo === 'ticket') {
        // âœ… Formato Estrecho de Ticket (Local e InstantÃ¡neo)
        success = await generatePDFBase64(orderData);
      } else {
        // âœ… Factura Formal A4 (Desde Google Sheets)
        success = await generateInvoice(orderData, tipo);
      }
      
      if (success) {
        console.log(`${tipo} generado con Ã©xito`);
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
    console.log('Solicitando confirmaciÃ³n interna...');
    setIsConfirming(true);
  };

  const executePayment = async () => {
    try {
      setIsProcessing(true);
      setIsConfirming(false);
      
      // Si ya hay un pedido creado (por propuesta o random), simplemente finalizamos
      if (currentOrderId && (riderConfirmed || deliveryType === 'pickup' || deliveryType === 'delivery')) {
          handleFinalSuccess();
          setIsProcessing(false);
          return;
      }

      const orderId = `ORD-${Date.now()}`;
      setCurrentOrderId(orderId);

      const orderData = {
        ID_Pedido: orderId,
        Cliente: user?.username || 'Cliente App',
        Email: user?.email || email || '',
        Pedido_Items: JSON.stringify(cart.map(item => ({
          nombre: item.nombre,
          cantidad: item.quantity,
          precio: item.precio
        }))),
        Total: finalTotal,
        Estado: 'Listo',
        Entrada: new Date().toLocaleTimeString(),
        Fecha: new Date().toLocaleDateString(),
        ID_Mesa: '',
        Tipo: deliveryType === 'delivery' ? 'Domicilio' : 'Local',
        ID_Rider: selectedRider?.id_delivery || '',
        Salida: '', 
        notas: '',
        whatsapp: 'Ver en Perfil',
        direccion: deliveryType === 'delivery' ? 'Domicilio (App)' : 'Retiro en Local',
        metodo: paymentType === 'cash' ? 'Efectivo' : 'Tarjeta',
        usuario: user?.email || 'App User'
      };

      const result = await saveOrder(orderData);
      
      if (result && (result.success || result.status === 'success' || result.row)) {
        handleFinalSuccess();
      } else {
        throw new Error('Error al guardar la orden');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo procesar la orden.');
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
        <Text style={styles.processingSubtext}>Tu pedido estÃ¡ llegando a la cocina</Text>
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
          <Text style={styles.successTitle}>Â¡Pedido Exitoso!</Text>
          <Text style={styles.successMessage}>Tu orden ya estÃ¡ siendo preparada.</Text>
          
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

          {deliveryType === 'delivery' && (
            <View style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: borders.radius.lg, backgroundColor: colors.primary + '08', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary + '40' }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                 <FontAwesome5 name="star" size={14} color={colors.primary} />
                 <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary, marginLeft: 8 }}>¿Tienes un repartidor de confianza?</Text>
               </View>
               <Text style={{ fontSize: 11, color: colors.text.secondary, marginBottom: 12 }}>
                 Puedes elegir a tu repartidor favorito para que te entregue este pedido. 
               </Text>
               <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}
                onPress={() => setRiderModalVisible(true)}
               >
                 <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: selectedRider ? colors.success + '20' : colors.primary + '10', justifyContent: 'center', alignItems: 'center' }}>
                    <FontAwesome5 name={selectedRider ? "user-check" : "motorcycle"} size={14} color={selectedRider ? colors.success : colors.primary} />
                 </View>
                 <Text style={{ marginLeft: 12, flex: 1, color: selectedRider ? colors.text.primary : colors.text.secondary, fontWeight: selectedRider ? 'bold' : 'normal' }}>
                   {selectedRider ? `${selectedRider.nombre} ${selectedRider.apellido}` : 'Seleccionar repartidor preferido'}
                 </Text>
                 <FontAwesome5 name="chevron-right" size={12} color={colors.primary} />
               </TouchableOpacity>
            </View>
          )}

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
                  <Text style={[styles.taxLabel, { color: colors.text.primary, fontWeight: 'bold' }]}>Â¿Aplicar Propina Legal?</Text>
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
              <Text style={styles.confirmButtonText}>Â¡SÃ­, Ordenar!</Text>
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
      {/* MODAL: SELECCIONAR REPARTIDOR */}
      <Modal visible={riderModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Repartidores Disponibles</Text>
              <TouchableOpacity onPress={() => setRiderModalVisible(false)}><FontAwesome5 name="times" size={20} /></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.primary + '05' }}
                onPress={() => sendRiderProposal(null)}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                  <FontAwesome5 name="users" size={16} color="#FFF" />
                </View>
                <View style={{ marginLeft: 15, flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', color: colors.primary }}>Disponible para todos (Random)</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>Cualquier repartidor podrá tomarlo</Text>
                </View>
              </TouchableOpacity>

              {riders.map(r => (
                <TouchableOpacity 
                  key={r.id_delivery} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  onPress={() => sendRiderProposal(r)}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
                    <FontAwesome5 name="motorcycle" size={16} color={colors.primary} />
                  </View>
                  <View style={{ marginLeft: 15, flex: 1 }}>
                    <Text style={{ fontWeight: 'bold' }}>{r.nombre} {r.apellido}</Text>
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>{r.vehiculo}</Text>
                  </View>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} />
                </TouchableOpacity>
              ))}
              {riders.length === 0 && <Text style={{ textAlign: 'center', margin: 20 }}>No hay repartidores disponibles</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: NEGOCIACIÃ“N EN VIVO (USUARIO FINAL) */}
      <Modal visible={isWaitingRider} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 25 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 30, padding: 30, width: '100%', alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 25, textAlign: 'center', color: colors.text.primary }}>Negociando Entrega...</Text>
                <Text style={{ color: colors.text.secondary, marginTop: 12, textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
                    Tu propuesta ha sido enviada a <Text style={{ fontWeight: 'bold', color: colors.primary }}>{selectedRider?.nombre}</Text>. Espera su respuesta en vivo.
                </Text>

                <View style={{ width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginVertical: 35, backgroundColor: colors.primary + '10' }}>
                    <Text style={{ fontSize: 38, fontWeight: 'bold', color: colors.primary }}>{countdown}</Text>
                </View>

                <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 25 }}>
                    Si el repartidor no acepta a tiempo, podrÃ¡s elegir a otro compaÃ±ero o lanzarlo al equipo general.
                </Text>

                <TouchableOpacity 
                  style={{ backgroundColor: colors.error + '15', padding: 18, borderRadius: 15, width: '100%', borderWidth: 1, borderColor: colors.error }}
                  onPress={() => {
                      stopWaiting();
                      setIsWaitingRider(false);
                      setRiderModalVisible(true);
                      Alert.alert('NegociaciÃ³n Cancelada', 'Puedes elegir otro repartidor o enviarlo como Random.');
                  }}
                >
                    <Text style={{ color: colors.error, fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>
                        CANCELAR NEGOCIACIÃ“N
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CheckoutScreen;
