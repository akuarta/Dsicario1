import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  StatusBar,
  TextInput,
  Switch,
  Image,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '../utils/showAlert';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCart, useDataSync } from '../contexts/AppContext';
import { CustomHeader } from '../components/CustomHeader';
import { generatePDFBase64 } from '../utils/pdfGenerator';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { generateInvoice } from '../utils/invoiceService';
import { useUser } from '../contexts/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { 
  fetchDeliveries, 
  saveOrder, 
  formatPrice, 
  saveTransferRecord,
  uploadVoucherImage,
  updateOrderStatus, 
  fetchOrderStatus, 
  updateOrderFinalDetails 
} from '../utils/api';
import { notifyRider } from '../utils/notifications';
import { NotificationService } from '../utils/notificationService';
import { CommonActions } from '@react-navigation/native';
import GlassPanel from '../components/GlassPanel';
import LocationPickerModal from '../components/LocationPickerModal';
import { CONFIG } from '../constants/Config';
import { getRouteDetails } from '../utils/api';
import { getDistance } from '../utils/mathUtils';

const CheckoutScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const params = route.params || {};
  const cart = params.cart || [];
  const totalCost = params.totalCost || 0;
  const paymentTypeProps = params.paymentTypeProps || 'Efectivo';
  const orderNoteProps = params.orderNoteProps || '';
  const orderNumber = params.orderId || params.orderNumber || `ORD-${Date.now()}`;

  const { clearCart, businessInfo, exchangeRates, waiterActiveSession } = useCart();
  const { user, username, email, userId } = useUser();
  const { syncAllData } = useDataSync();
  
  const availablePaymentMethods = businessInfo?.paymentMethods || ['Efectivo', 'Tarjeta'];

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [isWaitingRider, setIsWaitingRider] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [currentOrderId, setCurrentOrderId] = useState(orderNumber);
  const [paymentType, setPaymentType] = useState('Efectivo');
  const [voucherImage, setVoucherImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [riderConfirmed, setRiderConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [deliveryType, setDeliveryType] = useState('local');
  const [amountReceived, setAmountReceived] = useState('');
  const [includePropina, setIncludePropina] = useState(true);
  
  // Convert old 'cash'/'card' formats to new Spanish formats if present
  const initialPaymentType = paymentTypeProps === 'cash' ? 'Efectivo' : 
                             paymentTypeProps === 'card' ? 'Tarjeta' : 
                             (paymentTypeProps || availablePaymentMethods[0] || 'Efectivo');
                             
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedBankIdx, setSelectedBankIdx] = useState(0);
  const [orderNote, setOrderNote] = useState(orderNoteProps);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [costoEnvioBase, setCostoEnvioBase] = useState('100');
  const [isExpressEnvio, setIsExpressEnvio] = useState(false);
  const [currency, setCurrency] = useState('DOP');

  const availableCurrencies = businessInfo?.currencies || ['DOP', 'USD', 'EUR', 'COP', 'MXN'];

  // ── Cancel-by-text feature ──────────────────────────────────────────────
  const [cancelInput, setCancelInput] = useState('');
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [orderCancelledByClient, setOrderCancelledByClient] = useState(false);
  const orderCreatedAtRef = useRef(null);
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setCostoEnvioBase((businessInfo?.deliveryBaseFee || 100).toString());
  }, [businessInfo?.deliveryBaseFee]);

  const cycleCurrency = () => {
    const idx = availableCurrencies.indexOf(currency);
    setCurrency(availableCurrencies[(idx + 1) % availableCurrencies.length] || 'DOP');
  };
  const deadlineTimerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const selectedRiderRef = useRef(null);
  const currentOrderIdRef = useRef(currentOrderId);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calculations
  const totalDiscount = (cart || []).reduce((sum, item) => {
    const price = parseFloat(item.precio) || 0;
    const qty = parseFloat(item.quantity) || 0;
    const discPct = parseFloat(item.descuento) || 0;
    return sum + (discPct > 0 ? (price * discPct / 100) * qty : 0);
  }, 0);
  const subtotal = totalCost;
  const itbis = subtotal * 0.18;
  const propina = (deliveryType === 'local' && includePropina) ? subtotal * 0.10 : 0;
  const costoExpressDelNegocio = businessInfo?.expressFee || 50;
  
  // Cálculo dinámico de envío basado en ruta real
  const getDynamicDeliveryFee = () => {
    if (deliveryType !== 'delivery') return 0;
    const base = parseFloat(costoEnvioBase) || 0;
    const express = isExpressEnvio ? costoExpressDelNegocio : 0;
    
    // Si tenemos datos de ruta, podríamos cobrar por km extra si quisiéramos
    // Por ahora usamos la base, pero el usuario ya tiene la distancia real
    return base + express;
  };

  const costoEnvioCalculado = getDynamicDeliveryFee();
  const finalTotal = subtotal + itbis + propina + costoEnvioCalculado;
  
  const getFormattedAddress = () => {
    if (deliveryType !== 'delivery') return 'Local';
    if (selectedLocation && selectedLocation.latitude) {
      return `${selectedLocation.latitude},${selectedLocation.longitude} | ${deliveryAddress}`;
    }
    return deliveryAddress;
  };
  
  const currentRate = (currency === 'DOP' || currency === 'RD$') ? 1 : (exchangeRates?.[currency] || 1);
  const numericAmountReceived = parseFloat(amountReceived) || 0;
  const convertedAmountReceived = numericAmountReceived * currentRate;

  const isCashPayment = paymentType.toLowerCase().includes('efectivo') || paymentType === 'cash';
  const devuelta = isCashPayment ? Math.max(0, convertedAmountReceived - finalTotal) : 0;
  // Para meseros, el pago se puede procesar después (pide primero, paga después)
  const isAmountInsufficient = !waiterActiveSession && isCashPayment && convertedAmountReceived < finalTotal;

  const handleLocationSelected = async (locationData) => {
    setSelectedLocation({ latitude: locationData.latitude, longitude: locationData.longitude });
    setDeliveryAddress(locationData.address);
    
    // Obtener ruta real
    const originLocation = businessInfo?.location || CONFIG.STORE_LOCATION;
    if (originLocation) {
      const originSource = businessInfo?.location ? "Ubicación guardada del negocio" : "Ubicación por defecto (Config.js)";
      console.log(`\n=== LOG DE CÁLCULO DE DISTANCIA ===`);
      console.log(`1. ORIGEN (${originSource}): Lat ${originLocation.latitude}, Lng ${originLocation.longitude}`);
      console.log(`2. DESTINO (Cliente): Lat ${locationData.latitude}, Lng ${locationData.longitude}`);
      
      const route = await getRouteDetails(originLocation, {
        latitude: locationData.latitude,
        longitude: locationData.longitude
      });
      
      if (route) {
        setRouteData(route);
        console.log(`3. RESULTADO GOOGLE MAPS: Distancia = ${route.distance}, Tiempo = ${route.duration}`);
        console.log(`===================================\n`);
        
        // Alerta de debug para que el usuario lo vea en pantalla
        showAlert(
          'Log del Cálculo 🔍',
          `Origen: ${originSource}\n` +
          `A Destino: Tu selección en el mapa\n` +
          `Resultado: ${route.distance}`
        );
        
        // Validar radio máximo (si existe)
        const maxRadius = businessInfo?.deliveryMaxRadius || 15;
        const distanceKm = route.distanceValue / 1000;
        if (distanceKm > maxRadius) {
          showAlert(
            'Fuera de Rango 📍',
            `Lo sentimos, esta ubicación está a ${distanceKm.toFixed(1)} km, lo cual excede nuestro radio máximo de entrega (${maxRadius} km).`
          );
        }
      }
    }
  };

  const getPaymentIcon = (method) => {
    const m = method.toLowerCase();
    if (m.includes('efectivo') || m.includes('cash')) return 'money-bill';
    if (m.includes('tarjeta') || m.includes('card')) return 'credit-card';
    if (m.includes('transferencia') || m.includes('zelle') || m.includes('depósito')) return 'mobile-alt';
    if (m.includes('cripto') || m.includes('bitcoin')) return 'bitcoin';
    return 'wallet';
  };

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
    countdownCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginVertical: 35, backgroundColor: colors.surface, ...shadows.medium },
    countdownText: { fontSize: 42, fontWeight: 'bold', color: colors.primary },
    cancelBtn: { backgroundColor: colors.error + '15', padding: 18, borderRadius: 20, width: '100%', borderWidth: 1, borderColor: colors.error, marginTop: 10 },
    pulseCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary + '20' }
  }), [colors, darkMode]);

  const [isRefreshingRiders, setIsRefreshingRiders] = useState(false);

  useEffect(() => {
    const loadRiders = async () => {
      setIsRefreshingRiders(true);
      try {
        const data = await fetchDeliveries();
        const now = new Date();
        const filtered = data.filter(r => {
          const lastSeen = r.ultima_conexion ? new Date(r.ultima_conexion) : null;
          const onlineCol = r.online; 
          
          let isRecentlyOnline;
          if (onlineCol === true) {
            isRecentlyOnline = true;
          } else if (onlineCol === false) {
            isRecentlyOnline = false;
          } else {
            isRecentlyOnline = lastSeen ? (now - lastSeen) < 1800000 : false;
          }
          
          const available = r.activo && r.disponible && isRecentlyOnline;
          return available;
        });
        setRiders(filtered);
      } catch (e) {
        console.error('Error cargando repartidores:', e);
      } finally {
        setIsRefreshingRiders(false);
      }
    };
    
    if (riderModalVisible || riders.length === 0) {
      loadRiders();
    }
  }, [riderModalVisible]);

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
    pulseAnim.setValue(1); 
    setIsWaitingRider(false);
    setCountdown(25);
  }, [clearAllTimers]);

  const startWaitingCycle = useCallback((orderId, rider) => {
    clearAllTimers(); 
    currentOrderIdRef.current = orderId;
    selectedRiderRef.current = rider;
    setCountdown(25);
    setIsWaitingRider(true);
    
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: true })
      ])
    ).start();

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
        
        if (estado === 'accepted' || estado === 'ready' || estado === 'on_the_way') {
          stopWaiting();
          setRiderConfirmed(true);
          showAlert('¡Rider aceptó! 🛵', `${selectedRiderRef.current?.nombre} está disponible. Ahora puedes confirmar tu pedido.`); // encoding fix
        } else if (estado === 'rejected' || estado === 'rechazado' || estado === 'cancelled') {
          stopWaiting();
          setSelectedRider(null);
          setRiderModalVisible(false);
          showAlert('Rechazado ❌', 'El repartidor no puede tomar el pedido.');
        }
      } catch (e) { console.warn('[Poll]', e.message); }
    }, 2000);

    deadlineTimerRef.current = setTimeout(() => {
      const riderName = selectedRiderRef.current?.nombre || 'El repartidor';
      const oid = currentOrderIdRef.current;
      stopWaiting();
      setSelectedRider(null);
      setRiderModalVisible(false);
      showAlert('⏳ Sin respuesta', `${riderName} no respondió a tiempo.`);
      updateOrderStatus(oid, 'pending', { ID_Rider: '' }).catch(() => {});
    }, 25000);
  }, [stopWaiting]);

  const sendRiderProposal = useCallback(async (rider) => {
    try {
      if (deliveryType === 'delivery' && (!deliveryAddress || !deliveryAddress.trim())) {
        setRiderModalVisible(false);
        setTimeout(() => {
          showAlert('📍 Falta dirección', 'Para pedir un delivery, primero debes escribir la dirección de destino.');
        }, 300);
        return;
      }

      const isBusinessClosed = businessInfo?.closed === true;
      const oid = `ORD-${Date.now().toString(36).toUpperCase()}`;
      
      setSelectedRider(rider);

      // ✅ FIX: Guardar el pedido PRIMERO para obtener el ID real antes de iniciar el polling
      const orderData = {
        ID_Pedido: oid,
        userId: userId || '',
        Cliente: username || 'Cliente App',
        Email: email || '',
        Pedido_Items: JSON.stringify(cart.map(item => ({ 
          nombre: isBusinessClosed ? `[PRE] ${item.nombre}` : item.nombre, 
          cantidad: item.quantity, 
          precio: item.precio,
          isPreOrder: isBusinessClosed
        }))),
        items: cart,
        Total: finalTotal,
        Envio: costoEnvioCalculado,
        Estado: isBusinessClosed ? 'Pre-orden' : (rider ? 'Propuesta' : 'Pendiente'),
        Entrada: new Date().toLocaleTimeString(),
        Fecha: new Date().toLocaleDateString(),
        Tipo: isBusinessClosed ? 'Pre-orden' : (deliveryType === 'delivery' ? 'Domicilio' : 'Local'),
        'Delivery?': deliveryType === 'delivery', // ✅ Campo booleano para el Excel
        ID_Rider: rider?.id_delivery || '',
        Notas: (isBusinessClosed ? '[PRE-ORDEN] ' : '') + orderNote,
        Direccion: getFormattedAddress(),
        Metodo: paymentType,
        Usuario: email || 'App User',
        total: finalTotal,
        Ref_Pago: voucherImage ? 'Voucher adjunto' : ''
      };

      const saveRes = await saveOrder(orderData);
      const finalOrderId = saveRes.internalId || oid;
      
      setCurrentOrderId(finalOrderId);

      if (rider && !isBusinessClosed) {
        // ✅ FIX: Ahora iniciamos el ciclo con el ID real desde el principio
        setRiderModalVisible(false);
        startWaitingCycle(finalOrderId, rider);
        notifyRider(rider, { 
          orderId: finalOrderId, 
          cliente: username, 
          total: finalTotal.toFixed(2), 
          direccion: getFormattedAddress(), 
          riderId: rider.id_delivery 
        });
        currentOrderIdRef.current = finalOrderId;
      } else {
        setRiderConfirmed(true);
        setRiderModalVisible(false);
      }
    } catch (e) {
      console.error('[NEGOTIATION] Error en sendRiderProposal:', e);
      showAlert('Error', 'No se pudo procesar la propuesta.');
      setIsWaitingRider(false);
    }
  }, [cart, email, username, finalTotal, costoEnvioCalculado, deliveryAddress, deliveryType, paymentType, startWaitingCycle, orderNote, voucherImage]);

  const executePayment = async () => {
    // ✅ Web: pedir permiso ANTES de todo (gesto real del usuario → browser lo acepta)
    // Hacemos await para que el permiso esté concedido cuando llegue handleFinalSuccess
    await NotificationService.requestWebPermission().catch(() => {});
    try {
      setIsProcessing(true);

      if (riderConfirmed && currentOrderId) {
        if (paymentType.toLowerCase().includes('transf')) {
          if (!voucherImage && (!paymentReference || !paymentReference.trim())) {
            showAlert('Comprobante Requerido', 'Para pagar con transferencia debes subir una foto del comprobante o escribir el número de referencia.');
            setIsProcessing(false);
            return;
          }

          let firebaseImageUrl = '';
          if (voucherImage && voucherImage.base64) {
            firebaseImageUrl = await uploadVoucherImage(voucherImage.base64, currentOrderId);
          }

          const selectedBank = businessInfo?.transferDetails?.[0] || {};
          await saveTransferRecord({
            orderId: currentOrderId,
            banco: selectedBank.Banco || 'Varios',
            cuenta: selectedBank.No_Cuenta || selectedBank.Cuenta || '',
            titular: selectedBank.Titular || '',
            total: finalTotal,
            voucherImage: firebaseImageUrl || ''
          });
        }

        const isCash = paymentType.toLowerCase().includes('efectivo') || paymentType === 'cash';
        const finalPaymentData = {
          metodo: paymentType,
          Pagado: isCash ? numericAmountReceived : 0,
          Devuelta: isCash ? devuelta : 0,
          Ref_Pago: paymentReference || (voucherImage ? 'Voucher adjunto' : ''),
          Estado: 'pending'
        };

        await updateOrderFinalDetails(currentOrderId, finalPaymentData);
        handleFinalSuccess(currentOrderId);
        return;
      }

      if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
        showAlert('Falta dirección', 'Por favor ingresa la dirección de entrega.');
        setIsProcessing(false);
        return;
      }

      if (paymentType.toLowerCase().includes('transf')) {
        if (!voucherImage && (!paymentReference || !paymentReference.trim())) {
          showAlert('Comprobante Requerido', 'Para pagar con transferencia debes subir una foto del comprobante o escribir el número de referencia.');
          setIsProcessing(false);
          return;
        }
      }

      const oid = `ORD-${Date.now().toString(36).toUpperCase()}`;
      setCurrentOrderId(oid);

      const orderData = {
        ID_Pedido: oid,
        orderId: oid,
        userId: userId || '',
        Cliente: waiterActiveSession ? (clientName || 'Cliente Invitado') : (username || 'Cliente App'),
        Email: waiterActiveSession ? clientPhone : (email || ''),
        items: cart,
        Total: finalTotal,
        total: finalTotal,
        Envio: costoEnvioCalculado,
        Estado: deliveryType === 'delivery' && selectedRider ? 'Propuesta' : 'Pendiente',
        Entrada: new Date().toLocaleTimeString(),
        Fecha: new Date().toLocaleDateString(),
        Tipo: deliveryType === 'delivery' ? 'Domicilio' : 'Local',
        'Delivery?': deliveryType === 'delivery', // ✅ Campo booleano para el Excel
        ID_Rider: selectedRider?.id_delivery || '',
        direccion: getFormattedAddress(),
        metodo: paymentType,
        Pagado: (paymentType.toLowerCase().includes('efectivo') || paymentType === 'cash') ? numericAmountReceived : 0,
        Devuelta: (paymentType.toLowerCase().includes('efectivo') || paymentType === 'cash') ? devuelta : 0,
        Ref_Pago: voucherImage ? 'Voucher adjunto' : ''
      };

      const saveRes = await saveOrder(orderData);
      
      if (saveRes.success) {
        if (paymentType.toLowerCase().includes('transf')) {
          let firebaseImageUrl = '';
          if (voucherImage && voucherImage.base64) {
            // No bloqueamos el UI con el loading si ya pasó el saveRes, 
            // pero nos aseguramos de subirlo antes del saveTransferRecord
            firebaseImageUrl = await uploadVoucherImage(voucherImage.base64, saveRes.internalId);
          }

          const selectedBank = businessInfo?.transferDetails?.[selectedBankIdx] || businessInfo?.transferDetails?.[0] || {};
          await saveTransferRecord({
            orderId: saveRes.internalId,
            banco: selectedBank.Banco || 'Varios',
            cuenta: selectedBank.No_Cuenta || selectedBank.Cuenta || '',
            titular: selectedBank.Titular || '',
            total: finalTotal,
            voucherImage: firebaseImageUrl || ''
          });
        }

        if (deliveryType === 'delivery' && selectedRider) {
          const finalOrderId = saveRes.internalId || oid;
          setCurrentOrderId(finalOrderId);
          notifyRider(selectedRider, { 
            orderId: finalOrderId, 
            cliente: username, 
            total: finalTotal.toFixed(2), 
            direccion: getFormattedAddress(), 
            riderId: selectedRider.id_delivery 
          });
          startWaitingCycle(finalOrderId, selectedRider);
        } else {
          const finalId = saveRes.internalId || oid;
          if (saveRes.internalId) setCurrentOrderId(saveRes.internalId);
          handleFinalSuccess(finalId);
        }
      }
    } catch (e) {
      console.error('Error executePayment:', e);
      showAlert('Error', 'No se pudo procesar el pedido. Reintenta.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalSuccess = (orderId) => {
    const finalId = orderId || currentOrderId;
    console.log('[CHECKOUT] Final Success para pedido:', finalId);
    
    setOrderCompleted(true);
    orderCreatedAtRef.current = Date.now();
    clearCart();
    syncAllData();
    setIsProcessing(false);
    
    // Si por alguna razón el ID no está en el estado, lo forzamos para la UI
    if (orderId && orderId !== currentOrderId) {
      setCurrentOrderId(orderId);
    }

    // 🔔 Bug #3 fix: notificar al cliente que su pedido fue recibido
    NotificationService.sendLocalNotification(
      '📋 ¡Pedido Recibido!',
      `Tu pedido #${finalId} fue registrado correctamente. Te avisaremos cuando esté listo.`
    ).catch(err => console.error('[Notif] Error al enviar local:', err));
  };

  const handleClientCancelOrder = async () => {
    if (cancelInput.trim().toLowerCase() !== 'cancelar') return;
    const CANCEL_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
    if (orderCreatedAtRef.current && Date.now() - orderCreatedAtRef.current > CANCEL_WINDOW_MS) {
      showAlert('⏰ Tiempo agotado', 'Solo puedes cancelar tu pedido dentro de los primeros 5 minutos.');
      return;
    }
    try {
      setIsCancellingOrder(true);
      await updateOrderStatus(currentOrderId, 'cancelled', {});
      setOrderCancelledByClient(true);
      NotificationService.sendLocalNotification(
        '❌ Pedido Cancelado',
        `Tu pedido #${currentOrderId} fue cancelado correctamente.`
      ).catch(() => {});
    } catch (e) {
      showAlert('Error', 'No se pudo cancelar el pedido. Contáctanos directamente.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleGenerateInvoice = async (tipo) => {
    setIsGeneratingPDF(true);
    try {
      const orderData = {
        tipo, idorden: currentOrderId, fecha: new Date().toLocaleDateString(), hora: new Date().toLocaleTimeString(),
        NombreLocal: businessInfo?.name || 'D\'Sicario', DireccionLocal: businessInfo?.address || 'República Dominicana',
        EmailLocal: businessInfo?.email || 'hairoman28@gmail.com', TelefonoLocal: businessInfo?.phone || '809-000-0000',
        logo: businessInfo?.logo, Cliente: username || 'Invitado', EmailUser: email || 'n/a', metodo: paymentType,
        items: cart.map(item => ({ 'Detalle': item.nombre, 'Cant': item.quantity, 'Precio': item.precio, 'Total': (item.precio * item.quantity).toFixed(2) })),
        Subtotal: subtotal.toFixed(2), ITBIS: itbis.toFixed(2), Descuento: totalDiscount.toFixed(2), Propina: propina.toFixed(2), CostoEnvio: costoEnvioCalculado.toFixed(2), Total: finalTotal.toFixed(2),
        MonedaPago: currency, Pagado: isCashPayment ? numericAmountReceived.toFixed(2) : "0.00", Devuelta: devuelta.toFixed(2)
      };

      if (tipo === 'ticket') await generatePDFBase64(orderData);
      else await generateInvoice(orderData, tipo);
    } catch (error) {
      showAlert('Error', 'No se pudo generar el comprobante.');
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
        <ScrollView
          contentContainerStyle={[styles.successContainer, { justifyContent: 'flex-start', paddingTop: 48, paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIcon}><FontAwesome5 name="check" size={40} color="#FFF" /></View>
          <Text style={styles.successTitle}>¡Pedido Exitoso!</Text>
          <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, width: '100%', marginBottom: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary }}>
            <Text style={{ fontSize: 12, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 1 }}>Código de Pedido</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary, marginVertical: 5 }}>{currentOrderId}</Text>
            <Text style={{ fontSize: 18, color: colors.text.primary, fontWeight: '600' }}>Total: {formatPrice(finalTotal)}</Text>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={() => handleGenerateInvoice('ticket')} disabled={isGeneratingPDF}>
            <FontAwesome5 name="receipt" size={18} color="#FFF" />
            <Text style={styles.backButtonText}>{isGeneratingPDF ? 'Generando...' : 'Descargar Ticket'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }]} 
            onPress={() => navigation.navigate('DeliveryTracking', { orderId: currentOrderId })}
          >
            <FontAwesome5 name={deliveryType === 'local' ? "store" : "map-marked-alt"} size={16} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary, marginLeft: 10 }]}>
              {deliveryType === 'local' ? 'Ver Ubicación / Llegar' : 'Rastrear Pedido'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: colors.success }]} 
            onPress={() => navigation.navigate('DeliveryTracking', { orderId: currentOrderId, autoOpenScanner: true })}
          >
            <FontAwesome5 name="qrcode" size={16} color="#FFF" />
            <Text style={[styles.backButtonText, { marginLeft: 10 }]}>Recibir Pedido (Escanear)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={async () => {
              clearCart();
              await syncAllData();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'InicioTab' }] }));
            }}
          >
            <Text style={{ color: colors.text.secondary, fontWeight: 'bold' }}>Volver al Inicio</Text>
          </TouchableOpacity>

          {/* ── Panel de Cancelación por texto ── */}
          {!orderCancelledByClient ? (
            <View style={{
              marginTop: 28,
              width: '100%',
              backgroundColor: colors.error ? colors.error + '12' : '#FF000012',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.error ? colors.error + '40' : '#FF000040',
              padding: 16,
            }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.error || '#D32F2F', marginBottom: 6 }}>
                ❌ ¿Deseas cancelar tu pedido?
              </Text>
              <Text style={{ fontSize: 12, color: colors.text?.secondary || '#666', marginBottom: 12 }}>
                {'Solo puedes cancelar dentro de los primeros 5 minutos. Escribe '}
                <Text style={{ fontWeight: 'bold', color: colors.error || '#D32F2F' }}>cancelar</Text>
                {' para confirmar.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: colors.border || '#ccc',
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: colors.text?.primary || '#000',
                    backgroundColor: colors.background || '#fff',
                  }}
                  placeholder='Escribe "cancelar"'
                  placeholderTextColor={colors.text?.tertiary || '#999'}
                  value={cancelInput}
                  onChangeText={setCancelInput}
                  autoCapitalize='none'
                  returnKeyType='done'
                  onSubmitEditing={handleClientCancelOrder}
                />
                <TouchableOpacity
                  onPress={handleClientCancelOrder}
                  disabled={cancelInput.trim().toLowerCase() !== 'cancelar' || isCancellingOrder}
                  style={[{
                    backgroundColor: colors.error || '#D32F2F',
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }, (cancelInput.trim().toLowerCase() !== 'cancelar' || isCancellingOrder) && { opacity: 0.4 }]}
                >
                  {isCancellingOrder
                    ? <ActivityIndicator size='small' color='#FFF' />
                    : <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Cancelar</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 28, alignItems: 'center', padding: 16 }}>
              <FontAwesome5 name='check-circle' size={30} color={colors.success || '#4CAF50'} />
              <Text style={{ marginTop: 10, fontSize: 15, fontWeight: 'bold', color: colors.success || '#4CAF50' }}>
                Pedido cancelado exitosamente
              </Text>
              <Text style={{ fontSize: 12, color: colors.text?.secondary || '#666', marginTop: 4, textAlign: 'center' }}>
                Tu pedido #{currentOrderId} fue cancelado. No se realizará ningún cobro.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Checkout" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {businessInfo?.closed && (
          <View style={[styles.section, { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderWidth: 1, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <FontAwesome5 name="moon" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.primary }}>MODO PRE-ORDEN ACTIVO</Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>Estamos fuera de horario, pero puedes dejar tu pedido listo. Lo procesaremos al abrir.</Text>
            </View>
          </View>
        )}

        {waiterActiveSession && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👨‍💼 Datos del Cliente (Modo Empleado)</Text>
            <TextInput
              style={{
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: borders.radius.md,
                padding: spacing.md,
                color: colors.text.primary,
                backgroundColor: colors.background,
                marginBottom: spacing.sm
              }}
              placeholder="Nombre del Cliente (Ej: Juan Pérez)"
              placeholderTextColor={colors.text.tertiary}
              value={clientName}
              onChangeText={setClientName}
            />
            <TextInput
              style={{
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: borders.radius.md,
                padding: spacing.md,
                color: colors.text.primary,
                backgroundColor: colors.background
              }}
              placeholder="Teléfono (Opcional)"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="phone-pad"
              value={clientPhone}
              onChangeText={setClientPhone}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Entrega</Text>
          <View style={styles.optionContainer}>
            {['local', 'pickup', 'delivery'].map(type => (
              <TouchableOpacity key={type} style={[styles.optionButton, deliveryType === type && styles.optionButtonActive]} onPress={() => setDeliveryType(type)}>
                <FontAwesome5 name={type === 'local' ? 'utensils' : type === 'pickup' ? 'store' : 'motorcycle'} size={14} color={deliveryType === type ? '#FFF' : colors.text.secondary} />
                <Text style={[styles.optionText, deliveryType === type && styles.optionTextActive]}>{type === 'local' ? 'En Local' : type === 'pickup' ? 'Recogida' : 'A Domicilio'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {deliveryType === 'delivery' && (
            <View style={styles.riderTrustContainer}>
              <Text style={[styles.sectionTitle, { marginTop: 10, marginBottom: 8, fontSize: typography.sizes.md }]}>📍 Dirección de Entrega</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TextInput
                  style={{ 
                    flex: 1, 
                    marginRight: 10, 
                    borderColor: colors.border, 
                    borderWidth: 1,
                    borderRadius: borders.radius.md,
                    padding: spacing.md,
                    color: colors.text.primary,
                    backgroundColor: colors.background
                  }}
                  placeholder="Ej: Calle Principal 123..."
                  placeholderTextColor={colors.text.tertiary}
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  returnKeyType="next"
                />
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: colors.primary, 
                    padding: 15, 
                    borderRadius: borders.radius.md, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    aspectRatio: 1
                  }}
                  onPress={() => setIsMapVisible(true)}
                >
                  <FontAwesome5 name="map-marker-alt" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>

              {routeData && (
                <View style={{ 
                  flexDirection: 'row', 
                  backgroundColor: colors.primary + '10', 
                  padding: 10, 
                  borderRadius: 10, 
                  marginBottom: 15,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.primary + '20'
                }}>
                  <FontAwesome5 name="route" size={14} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={{ fontSize: 12, color: colors.text.primary, flex: 1 }}>
                    Distancia: <Text style={{ fontWeight: 'bold' }}>{routeData.distance}</Text> • Tiempo est.: <Text style={{ fontWeight: 'bold' }}>{routeData.duration}</Text>
                  </Text>
                </View>
              )}

              <View style={styles.riderTrustHeader}>
                <FontAwesome5 name="star" size={12} color={!deliveryAddress?.trim() ? colors.text.secondary : colors.primary} />
                <Text style={[styles.riderTrustTitle, !deliveryAddress?.trim() && { color: colors.text.secondary }]}>
                  ¿Repartidor preferido? {!deliveryAddress?.trim() && '(Escribe la dirección primero)'}
                </Text>
              </View>
              <TouchableOpacity 
                style={[
                  styles.riderSelectBtn, 
                  (!deliveryAddress || deliveryAddress.trim().length === 0) && { opacity: 0.3, backgroundColor: '#E0E0E0' }
                ]} 
                disabled={!deliveryAddress || deliveryAddress.trim().length === 0}
                onPress={() => {
                  if (!deliveryAddress || deliveryAddress.trim().length === 0) return;
                  
                  console.log('[CHECKOUT] Botón presionado. riderModalVisible actual:', riderModalVisible);
                  if (riders.length === 0) {
                    showAlert(
                      'No hay repartidores 🛵',
                      'No hemos encontrado repartidores Online, Activos y Disponibles en este momento.\n\nRevisa que el repartidor haya iniciado sesión y marcado su estado como Online.'
                    );
                  }
                  setRiderModalVisible(true);
                }}
              >
                <View style={[styles.riderIconBadge, selectedRider && { backgroundColor: colors.success + '20' }]}>
                  <FontAwesome5 
                    name={!deliveryAddress?.trim() ? "lock" : (selectedRider ? "user-check" : "motorcycle")} 
                    size={14} 
                    color={!deliveryAddress?.trim() ? colors.text.secondary : (selectedRider ? colors.success : colors.primary)} 
                  />
                </View>
                <Text style={{ marginLeft: 12, flex: 1, color: !deliveryAddress?.trim() ? colors.text.secondary : colors.text.primary, fontWeight: selectedRider ? 'bold' : 'normal' }}>
                  {selectedRider ? `${selectedRider.nombre} ${selectedRider.apellido}` : 'Seleccionar repartidor'}
                </Text>
                <FontAwesome5 name="chevron-right" size={12} color={!deliveryAddress?.trim() ? colors.text.secondary : colors.primary} />
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
                <Text style={{ fontSize: typography.sizes.sm, color: colors.text.primary, fontWeight: 'bold' }}>Tarifa de envío:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{formatPrice(parseFloat(costoEnvioBase) || 0)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesome5 name="bolt" size={16} color="#FF9800" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: typography.sizes.sm, color: colors.text.primary, fontWeight: 'bold' }}>Envío Express (+{formatPrice(costoExpressDelNegocio)})</Text>
                </View>
                <Switch
                  value={isExpressEnvio}
                  onValueChange={setIsExpressEnvio}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={isExpressEnvio ? colors.primary : '#f4f3f4'}
                />
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Resumen</Text>
          {cart.map((item, i) => (
            <View key={i} style={styles.orderItem}>
              <View style={{ flex: 1 }}>
                {item.isPreOrder && (
                  <Text style={{ fontSize: 10, color: colors.primary, fontWeight: 'bold', marginBottom: 2 }}>[PRE-ORDEN]</Text>
                )}
                <Text style={styles.itemName}>{item.nombre}</Text>
              </View>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              <Text style={styles.itemTotal}>{formatPrice(item.precio * item.quantity)}</Text>
            </View>
          ))}
          <View style={{ marginTop: 10 }}>
            <View style={styles.taxRow}><Text style={styles.taxLabel}>Subtotal</Text><Text style={styles.taxValue}>{formatPrice(subtotal)}</Text></View>
            <View style={styles.taxRow}><Text style={styles.taxLabel}>Impuestos (18%)</Text><Text style={styles.taxValue}>{formatPrice(itbis)}</Text></View>
            {propina > 0 && <View style={styles.taxRow}><Text style={styles.taxLabel}>Propina (10%)</Text><Text style={styles.taxValue}>{formatPrice(propina)}</Text></View>}
            {costoEnvioCalculado > 0 && <View style={styles.taxRow}><Text style={styles.taxLabel}>Costo de Envío {isExpressEnvio ? '(Express)' : ''}</Text><Text style={styles.taxValue}>{formatPrice(costoEnvioCalculado)}</Text></View>}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalAmount}>{formatPrice(finalTotal)}</Text></View>
          </View>
        </View>

        <View style={[styles.section, riderConfirmed && { borderColor: colors.success, borderWidth: 2, padding: 15, borderRadius: 20 }]}>
          <Text style={styles.sectionTitle}>
            {riderConfirmed ? '🌟 PASO FINAL: DETALLES DE PAGO' : 'Pago'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20, paddingBottom: 15, marginBottom: 5 }}>
            {(businessInfo?.paymentMethods || ['Efectivo', 'Tarjeta']).filter(method => {
              if (businessInfo?.paymentMethodsDetailed && businessInfo.paymentMethodsDetailed.length > 0) {
                  const detailed = businessInfo.paymentMethodsDetailed.find(m => {
                      const mName = m['Metodo Pago'] || m['metodo pago'] || m['Metodo_Pago'] || m['Metodo_pago'] || '';
                      return mName.toLowerCase() === method.toLowerCase();
                  });
                  if (detailed) {
                      const methodType = (detailed['Tipo Entrega'] || '').toLowerCase();
                      if (!methodType || methodType.includes('ambos')) return true;
                      if (deliveryType === 'delivery') return methodType.includes('delivery') || methodType.includes('domicilio');
                      return methodType.includes('local') || methodType.includes('recogida');
                  }
              }
              return true;
            }).map((method, index) => {
              const isActive = paymentType === method;
              return (
                <TouchableOpacity 
                  key={index}
                  style={[
                    styles.paymentMethod, 
                    { minWidth: 120, paddingHorizontal: 15, height: 55, marginVertical: 0 },
                    isActive && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 2 },
                    riderConfirmed && isActive && { backgroundColor: colors.success + '20', borderColor: colors.success, borderWidth: 2 }
                  ]} 
                  onPress={() => setPaymentType(method)}
                >
                  <FontAwesome5 name={getPaymentIcon(method)} size={20} color={isActive ? (riderConfirmed ? colors.success : colors.primary) : colors.text.secondary} />
                  <Text style={[styles.paymentText, isActive && { color: riderConfirmed ? colors.success : colors.primary, fontWeight: 'bold' }]}>{method}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Detalles de Transferencia si aplica */}
          {(paymentType.toLowerCase().includes('transf') && businessInfo?.transferDetails?.length > 0) && (
            <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text.primary, fontWeight: 'bold', marginBottom: 10 }}>
                <FontAwesome5 name="university" color={colors.primary} /> Elige el Banco a Transferir:
              </Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 5, marginBottom: 15 }}>
                {businessInfo.transferDetails.map((bank, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedBankIdx(idx)}
                    style={{
                      paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
                      borderColor: selectedBankIdx === idx ? colors.primary : colors.border,
                      backgroundColor: selectedBankIdx === idx ? colors.primary + '20' : colors.background
                    }}
                  >
                    <Text style={{ color: selectedBankIdx === idx ? colors.primary : colors.text.secondary, fontWeight: 'bold' }}>
                      {bank.Banco}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {businessInfo.transferDetails[selectedBankIdx] && (
                <View style={{ backgroundColor: colors.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>{businessInfo.transferDetails[selectedBankIdx].Banco}</Text>
                  <Text style={{ color: colors.text.primary, fontSize: 13 }}>Cuenta: <Text style={{ fontWeight: 'bold' }}>{businessInfo.transferDetails[selectedBankIdx].No_Cuenta || businessInfo.transferDetails[selectedBankIdx].Cuenta}</Text></Text>
                  <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Titular: {businessInfo.transferDetails[selectedBankIdx].Titular}</Text>
                </View>
              )}

              <TouchableOpacity 
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.5,
                    base64: true
                  });
                  if (!result.canceled) {
                    setVoucherImage(result.assets[0]);
                  }
                }}
                style={{ 
                  marginTop: 15, 
                  backgroundColor: colors.primary, 
                  padding: 12, 
                  borderRadius: 10, 
                  flexDirection: 'row', 
                  justifyContent: 'center', 
                  alignItems: 'center' 
                }}
              >
                <FontAwesome5 name="camera" size={16} color="white" style={{ marginRight: 10 }} />
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {voucherImage ? '✅ Comprobante Listo' : 'Subir Comprobante'}
                </Text>
              </TouchableOpacity>
              
              {voucherImage && (
                <View style={{ marginTop: 10, alignItems: 'center' }}>
                  <Image source={{ uri: voucherImage.uri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                  <TouchableOpacity onPress={() => setVoucherImage(null)}>
                    <Text style={{ color: colors.error, fontSize: 12, marginTop: 5 }}>Quitar imagen</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          
          {businessInfo?.paymentNotes && businessInfo.paymentNotes[paymentType] ? (
            <View style={{ backgroundColor: colors.primary + '10', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: colors.primary + '30' }}>
              <Text style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 5 }}>
                <FontAwesome5 name="info-circle" /> Instrucciones de Pago:
              </Text>
              <Text style={{ color: colors.text.secondary, fontSize: 14 }}>
                {businessInfo.paymentNotes[paymentType]}
              </Text>
            </View>
          ) : null}

          {businessInfo?.generalPaymentNote && typeof businessInfo.generalPaymentNote === 'string' && businessInfo.generalPaymentNote.trim() !== '' ? (
            <View style={{ backgroundColor: colors.background, padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.text.primary, fontWeight: 'bold', marginBottom: 5 }}>
                <FontAwesome5 name="info-circle" color={colors.text.secondary} /> Nota General:
              </Text>
              <Text style={{ color: colors.text.secondary, fontSize: 13, fontStyle: 'italic' }}>
                {businessInfo.generalPaymentNote}
              </Text>
            </View>
          ) : null}
          
          {(paymentType.toLowerCase().includes('efectivo') || paymentType.toLowerCase().includes('cash')) ? (
            <View style={styles.cashInputContainer}>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 10, fontWeight: 'bold' }}>
                {deliveryType === 'delivery' ? '¿Con cuánto dinero en efectivo enviará el pago al repartidor?' : '¿Con cuánto dinero en efectivo vas a pagar?'}
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }}>
                <TouchableOpacity 
                  onPress={cycleCurrency} 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingRight: spacing.md, borderRightWidth: 1, borderRightColor: colors.border, height: '100%' }}
                >
                  <Text style={{ fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text.primary, marginRight: 5 }}>{currency}</Text>
                  <FontAwesome5 name="caret-down" size={14} color={colors.text.secondary} />
                </TouchableOpacity>

                <TextInput 
                  style={{ flex: 1, fontSize: typography.sizes.xl, fontWeight: 'bold', color: colors.text.primary, paddingVertical: spacing.md, paddingHorizontal: spacing.md }} 
                  placeholder="Ej: 1000" 
                  keyboardType="numeric" 
                  value={amountReceived} 
                  onChangeText={setAmountReceived} 
                  placeholderTextColor="#A0A0A0" 
                  returnKeyType="done"
                  onSubmitEditing={executePayment}
                />
              </View>

              {numericAmountReceived > 0 && (
                <View style={styles.changeContainer}>
                  <Text style={styles.changeLabel}>
                    {deliveryType === 'delivery' ? 'Cambio a llevar por el repartidor:' : 'Cambio a devolver al cliente:'}
                  </Text>
                  <Text style={styles.changeValue}>
                    {formatPrice(devuelta)}
                    {(currency !== 'DOP' && currency !== 'RD$') ? ` (${currency} ${(devuelta / currentRate).toFixed(2)})` : ''}
                  </Text>
                </View>
              )}
            </View>
          ) : (paymentType.toLowerCase().includes('tarjeta') || paymentType.toLowerCase().includes('card')) ? (
            <View style={styles.cashInputContainer}>
              <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 10, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 10 }}>
                {deliveryType === 'delivery' 
                  ? 'El repartidor llevará el Verifone para que pagues con tu tarjeta al momento de la entrega.' 
                  : 'Podrás pagar con tu tarjeta en el mostrador del local.'}
              </Text>
            </View>
          ) : (paymentType.toLowerCase().includes('transf') || paymentType.toLowerCase().includes('zelle') || paymentType.toLowerCase().includes('paypal') || paymentType.toLowerCase().includes('binance') || paymentType.toLowerCase().includes('depósito')) ? (
            <View style={styles.cashInputContainer}>
              <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 10, fontWeight: 'bold' }}>
                Número de Referencia / Confirmación (Opcional)
              </Text>
              <TextInput 
                style={{ backgroundColor: colors.background, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: typography.sizes.md, color: colors.text.primary }} 
                placeholder="Ej: REF-123456" 
                value={paymentReference} 
                onChangeText={setPaymentReference} 
                placeholderTextColor="#A0A0A0" 
                returnKeyType="done"
                onSubmitEditing={executePayment}
              />
            </View>
          ) : null}
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
            {riderConfirmed ? '¡ACEPTADO! CONFIRMAR PEDIDO FINAL' : 
             waiterActiveSession ? `MANDAR A COCINA (${formatPrice(finalTotal)})` : 
             `Confirmar ${formatPrice(finalTotal)}`}
          </Text>
        </TouchableOpacity>
      </GlassPanel>

      <Modal visible={riderModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Repartidores {isRefreshingRiders && <ActivityIndicator size="small" color={colors.primary} />}</Text>
              <TouchableOpacity onPress={() => setRiderModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.riderItem} onPress={() => sendRiderProposal(null)}>
                <FontAwesome5 name="random" size={16} color={colors.primary} style={{ marginRight: 15 }} />
                <Text style={{ flex: 1, fontWeight: 'bold', color: colors.primary }}>Asignación automática</Text>
              </TouchableOpacity>
              {riders.length === 0 && !isRefreshingRiders && (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <FontAwesome5 name="ghost" size={30} color={colors.text.secondary} />
                  <Text style={{ color: colors.text.secondary, marginTop: 15, textAlign: 'center' }}>
                    No hay repartidores online en este momento.
                  </Text>
                </View>
              )}
              {riders.map(r => (
                <TouchableOpacity key={r.id_delivery} style={styles.riderItem} onPress={() => sendRiderProposal(r)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riderName}>{r.nombre} {r.apellido}</Text>
                    <Text style={styles.riderDetail}>ID: {r.id_delivery} • {r.vehiculo}</Text>
                  </View>
                  {(() => {
                    const lastSeen = r.ultima_conexion ? new Date(r.ultima_conexion) : null;
                    let isOnline;
                    if (r.online === true) isOnline = true;
                    else if (r.online === false) isOnline = false;
                    else isOnline = lastSeen ? (new Date() - lastSeen) < 1800000 : false;
                    
                    return (
                      <View style={{ alignItems: 'center' }}>
                        <View style={[styles.activeDot, { backgroundColor: isOnline ? '#4CAF50' : '#BDC3C7' }]} />
                        <Text style={{ fontSize: 8, color: isOnline ? '#4CAF50' : '#BDC3C7', fontWeight: 'bold', marginTop: 2 }}>
                          {isOnline ? 'ONLINE' : 'OFF'}
                        </Text>
                      </View>
                    );
                  })()}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isWaitingRider} transparent animationType="fade">
        <View style={styles.negotiationOverlay}>
          <GlassPanel intensity={40} style={styles.negotiationCard}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
              <FontAwesome5 name="motorcycle" size={24} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text.primary, textAlign: 'center' }}>Esperando respuesta...</Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 8, textAlign: 'center' }}>
              {selectedRiderRef.current ? `Enviando propuesta a ${selectedRiderRef.current.nombre}...` : 'Buscando repartidor disponible...'}
            </Text>
            
            <View style={{ justifyContent: 'center', alignItems: 'center', marginVertical: 20 }}>
              <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.countdownCircle}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => {
              stopWaiting();
              setSelectedRider(null);
              if (currentOrderIdRef.current) {
                updateOrderStatus(currentOrderIdRef.current, 'pending', { ID_Rider: '' }).catch(() => {});
              }
            }}>
              <Text style={{ color: colors.error, fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>CANCELAR SOLICITUD</Text>
            </TouchableOpacity>
          </GlassPanel>
        </View>
      </Modal>

      <LocationPickerModal 
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        onLocationSelected={handleLocationSelected}
        initialLocation={selectedLocation}
      />
    </SafeAreaView>
  );
};

export default CheckoutScreen;
