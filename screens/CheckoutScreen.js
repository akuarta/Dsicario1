import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { useCart, useDataSync } from '../contexts/AppContext';
import { CustomHeader } from '../components/CustomHeader';
import { generatePDFBase64 } from '../utils/pdfGenerator';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { generateInvoice } from '../utils/invoiceService';
import { useUser } from '../contexts/UserContext';
import { saveOrder, fetchDeliveries, updateOrderStatus, fetchOrderStatus, updateOrderFinalDetails } from '../utils/api';
import { notifyRider } from '../utils/notifications';
import GlassPanel from '../components/GlassPanel';

const CheckoutScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const params = route.params || {};
  const cart = params.cart || [];
  const totalCost = params.totalCost || 0;
  const paymentTypeProps = params.paymentTypeProps || 'cash';
  const orderNoteProps = params.orderNoteProps || '';
  const orderNumber = params.orderId || params.orderNumber || `ORD-${Date.now()}`;

  const { clearCart, businessInfo } = useCart();
  const { user, username, email } = useUser();
  const { syncAllData } = useDataSync();
  
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [isWaitingRider, setIsWaitingRider] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [currentOrderId, setCurrentOrderId] = useState(orderNumber);
  const [riderConfirmed, setRiderConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [deliveryType, setDeliveryType] = useState('local');
  const [amountReceived, setAmountReceived] = useState('');
  const [includePropina, setIncludePropina] = useState(true);
  const [paymentType, setPaymentType] = useState(paymentTypeProps);
  const [orderNote, setOrderNote] = useState(orderNoteProps);

  const deadlineTimerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const selectedRiderRef = useRef(null);
  const currentOrderIdRef = useRef(currentOrderId);

  // Calculations
  const totalDiscount = (cart || []).reduce((sum, item) => sum + (parseFloat(item.descuento || 0) * item.quantity), 0);
  const subtotal = totalCost;
  const itbis = totalCost * 0.18;
  const propina = (deliveryType === 'local' && includePropina) ? totalCost * 0.10 : 0;
  const finalTotal = (totalCost - totalDiscount) + itbis + propina;
  
  const numericAmountReceived = parseFloat(amountReceived) || 0;
  const devuelta = paymentType === 'cash' ? Math.max(0, numericAmountReceived - finalTotal) : 0;
  const isAmountInsufficient = paymentType === 'cash' && numericAmountReceived < finalTotal;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 150 },
    section: { backgroundColor: colors.surface, margin: spacing.md, padding: spacing.md, borderRadius: borders.radius.lg, ...shadows.small },
    sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary, marginBottom: spacing.md },
    optionContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: borders.radius.md, padding: spacing.xs, marginBottom: spacing.md },
    optionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borders.radius.sm },
    optionButtonActive: { backgroundColor: colors.primary },
    optionText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.text.secondary, marginLeft: spacing.xs },
    optionTextActive: { color: colors.text.white },
    riderTrustContainer: { marginTop: spacing.md, padding: spacing.md, borderRadius: borders.radius.lg, backgroundColor: colors.primary + '08', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary + '40' },
    riderTrustHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    riderTrustTitle: { fontSize: 13, fontWeight: 'bold', color: colors.primary, marginLeft: 8 },
    riderTrustBody: { fontSize: 11, color: colors.text.secondary, marginBottom: 12 },
    riderSelectBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, ...shadows.small },
    riderIconBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
    orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    itemName: { flex: 1, fontSize: typography.sizes.md, color: colors.text.primary, marginRight: spacing.sm },
    itemQuantity: { fontSize: typography.sizes.md, color: colors.text.secondary, marginRight: spacing.md },
    itemTotal: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.primary },
    taxRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.xs },
    taxLabel: { flex: 1, fontSize: typography.sizes.sm, color: colors.text.secondary },
    taxValue: { fontSize: typography.sizes.sm, color: colors.text.secondary, textAlign: 'right', minWidth: 100 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, marginTop: spacing.sm, borderTopWidth: 2, borderTopColor: colors.primary },
    totalLabel: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary },
    totalAmount: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.primary },
    paymentMethod: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.background, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border },
    paymentText: { fontSize: typography.sizes.md, fontWeight: typography.weights.medium, color: colors.text.primary, marginLeft: spacing.md },
    cashInputContainer: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.background, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border },
    cashInput: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.primary, paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.primary, textAlign: 'center' },
    changeContainer: { marginTop: spacing.md, alignItems: 'center' },
    changeLabel: { fontSize: typography.sizes.sm, color: colors.text.secondary, marginBottom: 5 },
    changeValue: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.success },
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, marginVertical: spacing.xs },
    footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
    confirmButton: { backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borders.radius.lg, ...shadows.medium },
    confirmButtonText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: '#FFF', marginLeft: spacing.sm },
    successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
    successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg, ...shadows.medium },
    successTitle: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text.primary, marginBottom: spacing.md },
    successMessage: { fontSize: typography.sizes.md, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg },
    backButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borders.radius.lg, width: '100%', justifyContent: 'center', marginBottom: spacing.md },
    backButtonText: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: '#FFF', marginLeft: spacing.sm },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '80%', ...shadows.large },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
    riderItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    riderName: { fontWeight: 'bold', fontSize: 16, color: colors.text.primary },
    riderDetail: { fontSize: 12, color: colors.text.secondary },
    activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
    negotiationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 25 },
    negotiationCard: { backgroundColor: colors.surface, borderRadius: 30, padding: 30, width: '100%', alignItems: 'center', ...shadows.large },
    countdownCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginVertical: 35, backgroundColor: colors.primary + '10' },
    countdownText: { fontSize: 38, fontWeight: 'bold', color: colors.primary },
    cancelBtn: { backgroundColor: colors.error + '15', padding: 18, borderRadius: 15, width: '100%', borderWidth: 1, borderColor: colors.error, marginTop: 10 }
  }), [colors, darkMode]);

  useEffect(() => {
    const loadRiders = async () => {
      try {
        const data = await fetchDeliveries();
        setRiders(data.filter(r => r.activo));
      } catch (e) {
        console.error('Error cargando repartidores:', e);
      }
    };
    loadRiders();
  }, []);

  const clearAllTimers = useCallback(() => {
    if (deadlineTimerRef.current) clearTimeout(deadlineTimerRef.current);
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    deadlineTimerRef.current = null;
    tickTimerRef.current = null;
    pollTimerRef.current = null;
  }, []);

  const stopWaiting = useCallback(() => {
    clearAllTimers();
    setIsWaitingRider(false);
    setCountdown(25);
  }, [clearAllTimers]);

  const startWaitingCycle = useCallback((orderId, rider) => {
    clearAllTimers(); // 🧹 Limpiar CUALQUIER timer anterior para evitar que se vuelva "loco"
    currentOrderIdRef.current = orderId;
    selectedRiderRef.current = rider;
    setCountdown(25);
    setIsWaitingRider(true);

    tickTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(tickTimerRef.current);
          tickTimerRef.current = null;
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    pollTimerRef.current = setInterval(async () => {
      try {
        const estadoRaw = await fetchOrderStatus(currentOrderIdRef.current);
        const estado = (estadoRaw || '').toLowerCase();
        
        if (estado === 'aceptado' || estado === 'listo' || estado === 'ready') {
          stopWaiting();
          setRiderConfirmed(true);
          // OJO: No marcamos éxito todavía, esperamos a que el cliente pulse el botón final
          Alert.alert('¡Rider aceptó! 🛵', `${selectedRiderRef.current?.nombre} está disponible. Ahora puedes confirmar tu pedido.`);
        } else if (estado === 'rechazado') {
          stopWaiting();
          setSelectedRider(null);
          setRiderModalVisible(false);
          Alert.alert('Rechazado ❌', 'El repartidor no puede tomar el pedido.');
        }
      } catch (e) { console.warn('[Poll]', e.message); }
    }, 2000);

    deadlineTimerRef.current = setTimeout(() => {
      const riderName = selectedRiderRef.current?.nombre || 'El repartidor';
      const oid = currentOrderIdRef.current;
      stopWaiting();
      setSelectedRider(null);
      setRiderModalVisible(false);
      Alert.alert('⏰ Sin respuesta', `${riderName} no respondió a tiempo.`);
      updateOrderStatus(oid, 'pending', { ID_Rider: '' }).catch(() => {});
    }, 25000);
  }, [stopWaiting]);

  const sendRiderProposal = async (rider) => {
    try {
      setIsProcessing(true);
      const oid = `ORD-${Date.now()}`;
      setCurrentOrderId(oid);
      setSelectedRider(rider);

      if (rider) {
        setRiderModalVisible(false);
        startWaitingCycle(oid, rider);
      }

      const orderData = {
        ID_Pedido: oid,
        Cliente: username || 'Cliente App',
        Email: email || '',
        Pedido_Items: JSON.stringify(cart.map(item => ({ nombre: item.nombre, cantidad: item.quantity, precio: item.precio }))),
        items: cart.map(item => ({ nombre: item.nombre, cantidad: item.quantity, precio: item.precio, notas: item.orderNote || '' })),
        Total: finalTotal,
        Estado: rider ? 'Propuesta' : 'Listo',
        Entrada: new Date().toLocaleTimeString(),
        Fecha: new Date().toLocaleDateString(),
        ID_Mesa: '',
        Tipo: 'Domicilio',
        ID_Rider: rider?.id_delivery || '',
        ID_Delivery: rider?.id_delivery || '',
        id_repartidor: rider?.id_delivery || '',
        Salida: '',
        notas: orderNote,
        whatsapp: 'Ver en Perfil',
        direccion: 'Domicilio (App)',
        metodo: paymentType === 'cash' ? 'Efectivo' : 'Tarjeta',
        usuario: email || 'App User'
      };

      // 🚀 VELOCIDAD MÁXIMA: Guardar y notificar al mismo tiempo
      const savePromise = saveOrder(orderData);
      
      if (rider) {
        // Enviar notificación y empezar contador YA
        notifyRider(rider, { orderId: oid, cliente: username, total: finalTotal.toFixed(2), direccion: 'Domicilio (App)', riderId: rider.id_delivery });
        startWaitingCycle(oid, rider);
      } else {
        setRiderConfirmed(true);
        setRiderModalVisible(false);
      }

      await savePromise; // Esperamos al final a que el Excel confirme
    } catch (e) {
      Alert.alert('Error', 'No se pudo procesar la propuesta.');
      setIsWaitingRider(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const executePayment = async () => {
    try {
      setIsProcessing(true);

      // CASO 1: El repartidor YA aceptó. Ahora el cliente confirma el trato final con sus datos de pago.
      if (riderConfirmed && currentOrderId) {
        // Recogemos los datos finales de pago que el cliente llenó
        const finalPaymentData = {
          metodo: paymentType === 'cash' ? 'Efectivo' : 'Tarjeta',
          Pagado: paymentType === 'cash' ? numericAmountReceived : 0,
          Devuelta: paymentType === 'cash' ? devuelta : 0,
          Estado: 'pending' // Ahora sí, a cocina
        };
        
        // Actualizamos el pedido en el Excel con los datos finales
        await updateOrderFinalDetails(currentOrderId, finalPaymentData);
        handleFinalSuccess();
        return;
      }

      // CASO 2: Empezamos el proceso de pedido
      const oid = `ORD-${Date.now()}`;
      setCurrentOrderId(oid);

      const itemsJson = JSON.stringify(cart.map(item => ({ 
        nombre: item.nombre, 
        cantidad: item.quantity, 
        precio: item.precio 
      })));

      const orderData = {
        ID_Pedido: oid,
        orderId: oid,
        Cliente: username || 'Cliente App',
        Email: email || '',
        Pedido_Items: itemsJson,
        items: cart.map(item => ({ nombre: item.nombre, cantidad: item.quantity, precio: item.precio })),
        Total: finalTotal,
        Estado: deliveryType === 'delivery' && selectedRider ? 'Propuesta' : 'Pendiente',
        Entrada: new Date().toLocaleTimeString(),
        Fecha: new Date().toLocaleDateString(),
        Tipo: deliveryType === 'delivery' ? 'Domicilio' : 'Local',
        ID_Rider: selectedRider?.id_delivery || '',
        Delivery: selectedRider?.id_delivery || '',
        whatsapp: 'Ver en Perfil',
        direccion: 'Domicilio (App)',
        metodo: paymentType === 'cash' ? 'Efectivo' : 'Tarjeta',
        usuario: email || 'App User'
      };

      if (deliveryType === 'delivery' && selectedRider) {
        // Enviar propuesta y esperar al repartidor
        const savePromise = saveOrder(orderData);
        notifyRider(selectedRider, { 
          orderId: oid, 
          cliente: username, 
          total: finalTotal.toFixed(2), 
          direccion: 'Domicilio (App)', 
          riderId: selectedRider.id_delivery 
        });
        startWaitingCycle(oid, selectedRider);
        await savePromise;
      } else {
        // Recogida o sin repartidor: Guardado directo
        await saveOrder(orderData);
        handleFinalSuccess();
      }
    } catch (e) {
      console.error('Error executePayment:', e);
      Alert.alert('Error', 'No se pudo procesar el pedido. Reintenta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalSuccess = () => {
    setOrderCompleted(true);
    clearCart();
    syncAllData();
    setIsProcessing(false);
  };

  const handleGenerateInvoice = async (tipo) => {
    setIsGeneratingPDF(true);
    try {
      const orderData = {
        tipo, idorden: currentOrderId, fecha: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString(),
        NombreLocal: businessInfo?.name || 'D´Sicario', DireccionLocal: businessInfo?.address || 'República Dominicana',
        EmailLocal: businessInfo?.email || 'hairoman28@gmail.com', TelefonoLocal: businessInfo?.phone || '809-000-0000',
        logo: businessInfo?.logo, Cliente: username || 'Invitado', EmailUser: email || 'n/a', metodo: paymentType === 'cash' ? 'Efectivo' : 'Tarjeta',
        items: cart.map(item => ({ 'Detalle': item.nombre, 'Cant': item.quantity, 'Precio': item.precio, 'Total': (item.precio * item.quantity).toFixed(2) })),
        Subtotal: subtotal.toFixed(2), ITBIS: itbis.toFixed(2), Descuento: totalDiscount.toFixed(2), Propina: propina.toFixed(2), Total: finalTotal.toFixed(2),
        Pagado: paymentType === 'cash' ? numericAmountReceived.toFixed(2) : "0.00", Devuelta: devuelta.toFixed(2)
      };

      if (tipo === 'ticket') await generatePDFBase64(orderData);
      else await generateInvoice(orderData, tipo);
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el comprobante.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isProcessing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary, marginTop: 20 }}>Procesando pedido...</Text>
      </View>
    );
  }

  if (orderCompleted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}><FontAwesome5 name="check" size={40} color="#FFF" /></View>
          <Text style={styles.successTitle}>¡Pedido Exitoso!</Text>
          <Text style={styles.successMessage}>ID: {currentOrderId}{'\n'}Total: RD${finalTotal.toFixed(2)}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => handleGenerateInvoice('ticket')} disabled={isGeneratingPDF}>
            <FontAwesome5 name="receipt" size={18} color="#FFF" />
            <Text style={styles.backButtonText}>{isGeneratingPDF ? 'Generando...' : 'Descargar Ticket'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }]} 
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Checkout" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Entrega</Text>
          <View style={styles.optionContainer}>
            {['local', 'pickup', 'delivery'].map(type => (
              <TouchableOpacity key={type} style={[styles.optionButton, deliveryType === type && styles.optionButtonActive]} onPress={() => setDeliveryType(type)}>
                <FontAwesome5 name={type === 'local' ? 'utensils' : type === 'pickup' ? 'store' : 'motorcycle'} size={14} color={deliveryType === type ? '#FFF' : colors.text.secondary} />
                <Text style={[styles.optionText, deliveryType === type && styles.optionTextActive]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {deliveryType === 'delivery' && (
            <View style={styles.riderTrustContainer}>
              <View style={styles.riderTrustHeader}>
                <FontAwesome5 name="star" size={12} color={colors.primary} />
                <Text style={styles.riderTrustTitle}>¿Repartidor preferido?</Text>
              </View>
              <TouchableOpacity style={styles.riderSelectBtn} onPress={() => setRiderModalVisible(true)}>
                <View style={[styles.riderIconBadge, selectedRider && { backgroundColor: colors.success + '20' }]}>
                  <FontAwesome5 name={selectedRider ? "user-check" : "motorcycle"} size={14} color={selectedRider ? colors.success : colors.primary} />
                </View>
                <Text style={{ marginLeft: 12, flex: 1, color: colors.text.primary, fontWeight: selectedRider ? 'bold' : 'normal' }}>
                  {selectedRider ? `${selectedRider.nombre} ${selectedRider.apellido}` : 'Seleccionar repartidor'}
                </Text>
                <FontAwesome5 name="chevron-right" size={12} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.sectionTitle, { mt: 20 }]}>Resumen</Text>
          {cart.map((item, i) => (
            <View key={i} style={styles.orderItem}>
              <Text style={styles.itemName}>{item.nombre}</Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              <Text style={styles.itemTotal}>RD${(item.precio * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={{ mt: 10 }}>
            <View style={styles.taxRow}><Text style={styles.taxLabel}>Subtotal</Text><Text style={styles.taxValue}>RD${subtotal.toFixed(2)}</Text></View>
            <View style={styles.taxRow}><Text style={styles.taxLabel}>Impuestos (18%)</Text><Text style={styles.taxValue}>RD${itbis.toFixed(2)}</Text></View>
            {propina > 0 && <View style={styles.taxRow}><Text style={styles.taxLabel}>Propina (10%)</Text><Text style={styles.taxValue}>RD${propina.toFixed(2)}</Text></View>}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalAmount}>RD${finalTotal.toFixed(2)}</Text></View>
          </View>
        </View>

        <View style={[styles.section, riderConfirmed && { borderColor: colors.success, borderWidth: 2, padding: 15, borderRadius: 20 }]}>
          <Text style={styles.sectionTitle}>
            {riderConfirmed ? '🏁 PASO FINAL: DETALLES DE PAGO' : 'Pago'}
          </Text>
          <TouchableOpacity 
            style={[styles.paymentMethod, riderConfirmed && { backgroundColor: colors.success + '10' }]} 
            onPress={() => setPaymentType(paymentType === 'cash' ? 'card' : 'cash')}
          >
            <FontAwesome5 name={paymentType === 'cash' ? 'money-bill' : 'credit-card'} size={20} color={colors.primary} />
            <Text style={styles.paymentText}>{paymentType === 'cash' ? 'Efectivo' : 'Tarjeta'}</Text>
          </TouchableOpacity>
          
          {paymentType === 'cash' && (
            <View style={styles.cashInputContainer}>
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 5 }}>¿Con cuánto pagarás al repartidor?</Text>
              <TextInput 
                style={[styles.cashInput, riderConfirmed && { borderColor: colors.success, borderWidth: 2 }]} 
                placeholder="Ej: 1000" 
                keyboardType="numeric" 
                value={amountReceived} 
                onChangeText={setAmountReceived} 
                placeholderTextColor={colors.text.disabled} 
              />
              {numericAmountReceived > 0 && (
                <View style={styles.changeContainer}>
                  <Text style={styles.changeLabel}>Devuelta para el repartidor:</Text>
                  <Text style={styles.changeValue}>RD${devuelta.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <GlassPanel intensity={20} style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.confirmButton, 
            (isAmountInsufficient || isProcessing) && { opacity: 0.5 },
            riderConfirmed && { backgroundColor: '#4CAF50' } // Verde si ya aceptó
          ]} 
          disabled={isAmountInsufficient || isProcessing} 
          onPress={executePayment}
        >
          <Text style={styles.confirmButtonText}>
            {riderConfirmed ? '¡ACEPTADO! CONFIRMAR PEDIDO FINAL' : `Confirmar RD$${finalTotal.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </GlassPanel>

      <Modal visible={riderModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Repartidores</Text>
              <TouchableOpacity onPress={() => setRiderModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.riderItem} onPress={() => sendRiderProposal(null)}>
                <FontAwesome5 name="random" size={16} color={colors.primary} style={{ marginRight: 15 }} />
                <Text style={{ flex: 1, fontWeight: 'bold', color: colors.primary }}>Asignación automática</Text>
              </TouchableOpacity>
              {riders.map(r => (
                <TouchableOpacity key={r.id_delivery} style={styles.riderItem} onPress={() => sendRiderProposal(r)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riderName}>{r.nombre} {r.apellido}</Text>
                    <Text style={styles.riderDetail}>ID: {r.id_delivery} • {r.vehiculo}</Text>
                  </View>
                  <View style={styles.activeDot} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isWaitingRider} transparent animationType="fade">
        <View style={styles.negotiationOverlay}>
          <View style={styles.negotiationCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 20, color: colors.text.primary }}>Esperando respuesta...</Text>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={stopWaiting}>
              <Text style={{ color: colors.error, fontWeight: 'bold' }}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CheckoutScreen;
