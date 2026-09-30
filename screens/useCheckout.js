import { useState, useEffect, useCallback, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from '../utils/showAlert';
import { useCart, useDataSync } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import { 
  fetchDeliveries, 
  saveOrder, 
  saveTransferRecord,
  uploadVoucherImage,
  updateOrderStatus, 
  fetchOrderStatus, 
  updateOrderFinalDetails 
} from '../utils/api';
import { notifyRider } from '../utils/notifications';
import { NotificationService } from '../utils/notificationService';
import { CONFIG } from '../constants/Config';
import { getRouteDetails } from '../utils/api';
import { generatePDFBase64 } from '../utils/pdfGenerator';
import { generateInvoice } from '../utils/invoiceService';

export function useCheckout({ navigation, route }) {
  const params = route.params || {};
  const cart = params.cart || [];
  const totalCost = params.totalCost || 0;
  const paymentTypeProps = params.paymentTypeProps || 'Efectivo';
  const orderNoteProps = params.orderNoteProps || '';
  const orderNumber = params.orderId || params.orderNumber || `ORD-${Date.now()}`;

  const { clearCart, businessInfo, exchangeRates, waiterActiveSession } = useCart();
  const { user, username, email, userId, metodosPago } = useUser();
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
  const [deliveryType, setDeliveryTypeState] = useState('pickup');
  const [rememberDeliveryType, setRememberDeliveryType] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [includePropina, setIncludePropina] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@dsicario_remember_delivery').then(v => {
      if (v === 'true') {
        setRememberDeliveryType(true);
        AsyncStorage.getItem('@dsicario_delivery_type').then(saved => {
          if (saved) setDeliveryTypeState(saved);
        });
      }
    });
  }, []);

  const setDeliveryType = useCallback((value) => {
    setDeliveryTypeState(value);
    if (rememberDeliveryType) {
      AsyncStorage.setItem('@dsicario_delivery_type', value);
    }
  }, [rememberDeliveryType]);

  const toggleRememberDelivery = useCallback(() => {
    const next = !rememberDeliveryType;
    setRememberDeliveryType(next);
    AsyncStorage.setItem('@dsicario_remember_delivery', String(next));
    if (next) {
      AsyncStorage.setItem('@dsicario_delivery_type', deliveryType);
    } else {
      AsyncStorage.removeItem('@dsicario_delivery_type');
    }
  }, [rememberDeliveryType, deliveryType]);

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
  const [costoEnvioBase, setCostoEnvioBase] = useState('50');
  const [isExpressEnvio, setIsExpressEnvio] = useState(false);
  const [currency, setCurrency] = useState('DOP');

  const [cancelInput, setCancelInput] = useState('');
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [orderCancelledByClient, setOrderCancelledByClient] = useState(false);
  const orderCreatedAtRef = useRef(null);

  const [isRefreshingRiders, setIsRefreshingRiders] = useState(false);

  const availableCurrencies = businessInfo?.currencies || ['DOP', 'USD', 'EUR', 'COP', 'MXN'];

  const deadlineTimerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const selectedRiderRef = useRef(null);
  const currentOrderIdRef = useRef(currentOrderId);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setCostoEnvioBase((businessInfo?.deliveryCostPerKm || 50).toString());
  }, [businessInfo?.deliveryCostPerKm]);

  const loadRiders = useCallback(async () => {
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
  }, []);

  // Precargar repartidores cuando el usuario selecciona entrega a domicilio
  useEffect(() => {
    if (deliveryType === 'delivery') {
      loadRiders();
    }
  }, [deliveryType]);

  // Recargar al abrir el modal (para tener datos frescos)
  useEffect(() => {
    if (riderModalVisible) {
      loadRiders();
    }
  }, [riderModalVisible]);

  const totalDiscount = (cart || []).reduce((sum, item) => {
    const price = parseFloat(item.precio) || 0;
    const qty = parseFloat(item.quantity) || 0;
    const discPct = parseFloat(item.descuento) || 0;
    return sum + (discPct > 0 ? (price * discPct / 100) * qty : 0);
  }, 0);
  const subtotal = totalCost;
  const taxRate = businessInfo?.taxEnabled !== false ? (businessInfo?.taxRate || 18) / 100 : 0;
  const taxInclusive = businessInfo?.taxInclusive === true;
  const itbis = subtotal * taxRate;
  const itbisAplicado = taxInclusive ? 0 : itbis;
  const propina = (deliveryType === 'local' && includePropina) ? subtotal * 0.10 : 0;
  const costoExpressDelNegocio = businessInfo?.expressPerKm || 30;
  const costPerKm = businessInfo?.deliveryCostPerKm || 50;

  const getFormattedAddress = () => {
    if (deliveryType !== 'delivery') return 'Local';
    if (selectedLocation && selectedLocation.latitude) {
      return `${selectedLocation.latitude},${selectedLocation.longitude} | ${deliveryAddress}`;
    }
    return deliveryAddress;
  };

  const getDynamicDeliveryFee = () => {
    if (deliveryType !== 'delivery') return 0;
    if (routeData && routeData.distanceValue > 0) {
      const distanceKm = routeData.distanceValue / 1000;
      const ratePerKm = isExpressEnvio ? costPerKm + costoExpressDelNegocio : costPerKm;
      return Math.round(distanceKm * ratePerKm);
    }
    const ratePerKm = isExpressEnvio ? costPerKm + costoExpressDelNegocio : costPerKm;
    return ratePerKm;
  };

  const costoEnvioCalculado = getDynamicDeliveryFee();
  const finalTotal = subtotal + itbisAplicado + propina + costoEnvioCalculado;

  const currentRate = (currency === 'DOP' || currency === 'RD$') ? 1 : (exchangeRates?.[currency] || 1);
  const numericAmountReceived = parseFloat(amountReceived) || 0;
  const convertedAmountReceived = numericAmountReceived * currentRate;

  const isCashPayment = paymentType.toLowerCase().includes('efectivo') || paymentType === 'cash';
  const devuelta = isCashPayment ? Math.max(0, convertedAmountReceived - finalTotal) : 0;
  const isAmountInsufficient = !waiterActiveSession && isCashPayment && convertedAmountReceived < finalTotal;

  const cycleCurrency = () => {
    const idx = availableCurrencies.indexOf(currency);
    setCurrency(availableCurrencies[(idx + 1) % availableCurrencies.length] || 'DOP');
  };

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
  }, [clearAllTimers, pulseAnim]);

  const startWaitingCycle = useCallback((orderId, rider) => {
    clearAllTimers(); 
    currentOrderIdRef.current = orderId;
    selectedRiderRef.current = rider;
    setCountdown(25);
    setIsWaitingRider(true);
    
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.in(Easing.ease), useNativeDriver: Platform.OS !== 'web' })
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
          console.log('[Checkout] Rider aceptó');
        } else if (estado === 'rejected' || estado === 'rechazado' || estado === 'cancelled') {
          stopWaiting();
          setSelectedRider(null);
          setRiderModalVisible(false);
          console.log('[Checkout] Rider rechazó');
          if (Platform.OS === 'web') {
            showAlert('No aceptado', 'El repartidor no pudo tomar tu pedido.');
          } else {
            const { ToastAndroid } = require('react-native');
            ToastAndroid.show('El repartidor no pudo tomar tu pedido', ToastAndroid.LONG);
          }
        }
      } catch (e) { console.warn('[Poll]', e.message); }
    }, 5000);

    deadlineTimerRef.current = setTimeout(() => {
      const oid = currentOrderIdRef.current;
      stopWaiting();
      setSelectedRider(null);
      setRiderModalVisible(false);
      console.log('[Checkout] Sin respuesta del rider');
      updateOrderStatus(oid, 'pending', { ID_Rider: '' }, true).catch(() => {});
      if (Platform.OS === 'web') {
        showAlert('No aceptado', 'El repartidor no respondió a tiempo.');
      } else {
        const { ToastAndroid } = require('react-native');
        ToastAndroid.show('El repartidor no respondió a tiempo', ToastAndroid.LONG);
      }
    }, 25000);
  }, [stopWaiting, pulseAnim]);

  const handleCancelWaitingRider = useCallback(() => {
    stopWaiting();
    setSelectedRider(null);
    if (currentOrderIdRef.current) {
      updateOrderStatus(currentOrderIdRef.current, 'pending', { ID_Rider: '' }, true).catch(() => {});
    }
  }, [stopWaiting]);

  const sendRiderProposal = useCallback(async (rider) => {
    try {
      if (deliveryType === 'delivery' && (!deliveryAddress || !deliveryAddress.trim())) {
        setRiderModalVisible(false);
        setTimeout(() => {
          console.warn('[Checkout] Falta dirección de delivery');
        }, 300);
        return;
      }

      const isBusinessClosed = businessInfo?.closed === true;
      const oid = `ORD-${Date.now().toString(36).toUpperCase()}`;
      
      setSelectedRider(rider);

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
        'Delivery?': deliveryType === 'delivery',
        ID_Rider: rider?.id_delivery || '',
        Notas: (isBusinessClosed ? '[PRE-ORDEN] ' : '') + orderNote,
        Direccion: getFormattedAddress(),
        Latitud: selectedLocation?.latitude || '',
        Longitud: selectedLocation?.longitude || '',
        Metodo: paymentType,
        Usuario: email || 'App User',
        total: finalTotal,
        Ref_Pago: voucherImage ? 'Voucher adjunto' : ''
      };

      const saveRes = await saveOrder(orderData);
      const finalOrderId = saveRes.internalId || oid;
      
      setCurrentOrderId(finalOrderId);

      if (rider && !isBusinessClosed) {
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
      console.error('[Checkout] Error procesando propuesta');
      setIsWaitingRider(false);
    }
  }, [cart, email, username, finalTotal, costoEnvioCalculado, deliveryAddress, deliveryType, paymentType, startWaitingCycle, orderNote, voucherImage, businessInfo, userId, getFormattedAddress, selectedLocation]);

  const executePayment = async () => {
    await NotificationService.requestWebPermission().catch(() => {});
    try {
      setIsProcessing(true);

      if (riderConfirmed && currentOrderId) {
        if (paymentType.toLowerCase().includes('transf')) {
          if (!voucherImage && (!paymentReference || !paymentReference.trim())) {
            console.warn('[Checkout] Falta comprobante de transferencia');
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
        console.warn('[Checkout] Falta dirección de entrega');
        setIsProcessing(false);
        return;
      }

      if (paymentType.toLowerCase().includes('transf')) {
        if (!voucherImage && (!paymentReference || !paymentReference.trim())) {
          console.warn('[Checkout] Falta comprobante de transferencia');
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
        'Delivery?': deliveryType === 'delivery',
        ID_Rider: selectedRider?.id_delivery || '',
        direccion: getFormattedAddress(),
        Latitud: selectedLocation?.latitude || '',
        Longitud: selectedLocation?.longitude || '',
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
      console.error('[Checkout] Error procesando pedido');
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
    
    if (orderId && orderId !== currentOrderId) {
      setCurrentOrderId(orderId);
    }

    NotificationService.sendLocalNotification(
      '📋 ¡Pedido Recibido!',
      `Tu pedido #${finalId} fue registrado correctamente. Te avisaremos cuando esté listo.`
    ).catch(err => console.error('[Notif] Error al enviar local:', err));
  };

  const handleClientCancelOrder = async () => {
    if (cancelInput.trim().toLowerCase() !== 'cancelar') return;
    const CANCEL_WINDOW_MS = 5 * 60 * 1000;
    if (orderCreatedAtRef.current && Date.now() - orderCreatedAtRef.current > CANCEL_WINDOW_MS) {
      console.warn('[Checkout] Tiempo de cancelación agotado');
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
      console.error('[Checkout] Error cancelando pedido');
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
      console.error('[Checkout] Error generando comprobante');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleLocationSelected = async (locationData) => {
    setSelectedLocation({ latitude: locationData.latitude, longitude: locationData.longitude });
    setDeliveryAddress(locationData.address);
    
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
        
        console.log(`[Checkout] Distancia calculada: ${route.distance}`);
        
        const maxRadius = businessInfo?.deliveryMaxRadius || 15;
        const distanceKm = route.distanceValue / 1000;
        if (distanceKm > maxRadius) {
          console.warn(`[Checkout] Fuera de rango: ${distanceKm.toFixed(1)} km > ${maxRadius} km`);
        }
      }
    }
  };

  return {
    // Context & Params
    cart, totalCost, businessInfo, exchangeRates, waiterActiveSession,
    user, username, email, userId, metodosPago, syncAllData,
    availablePaymentMethods, availableCurrencies, orderNumber,
    // State
    clientName, setClientName,
    clientPhone, setClientPhone,
    riders, selectedRider, setSelectedRider,
    riderModalVisible, setRiderModalVisible,
    isWaitingRider, isRefreshingRiders,
    countdown, currentOrderId, setCurrentOrderId,
    paymentType, setPaymentType,
    voucherImage, setVoucherImage,
    isUploading, setIsUploading,
    riderConfirmed, setRiderConfirmed,
    isProcessing, setIsProcessing,
    isGeneratingPDF, setIsGeneratingPDF,
    orderCompleted, setOrderCompleted,
    deliveryType, setDeliveryType, rememberDeliveryType, toggleRememberDelivery,
    amountReceived, setAmountReceived,
    includePropina, setIncludePropina,
    paymentReference, setPaymentReference,
    selectedBankIdx, setSelectedBankIdx,
    orderNote, setOrderNote,
    deliveryAddress, setDeliveryAddress,
    isMapVisible, setIsMapVisible,
    selectedLocation, setSelectedLocation,
    routeData, setRouteData,
    costoEnvioBase, setCostoEnvioBase,
    isExpressEnvio, setIsExpressEnvio,
    currency, setCurrency,
    cancelInput, setCancelInput,
    isCancellingOrder, setIsCancellingOrder,
    orderCancelledByClient, setOrderCancelledByClient,
    // Refs
    deadlineTimerRef, tickTimerRef, pollTimerRef,
    selectedRiderRef, currentOrderIdRef, pulseAnim, orderCreatedAtRef,
    // Computed
    totalDiscount, subtotal, itbis, taxInclusive, propina,
    costoExpressDelNegocio, costPerKm,
    costoEnvioCalculado, finalTotal,
    currentRate, numericAmountReceived, convertedAmountReceived,
    isCashPayment, devuelta, isAmountInsufficient,
    // Callbacks
    handleLocationSelected, executePayment, handleFinalSuccess,
    handleClientCancelOrder, handleGenerateInvoice,
    cycleCurrency, getFormattedAddress, getDynamicDeliveryFee,
    clearAllTimers, stopWaiting, startWaitingCycle, sendRiderProposal, handleCancelWaitingRider,
  };
}
