import { showAlert } from '../utils/showAlert';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Image,
  Animated,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { updateOrderStatus, getRouteDetails } from '../utils/api';
import { subscribeToRiderLocation } from '../utils/locationService';
import { getDistance, getDistanceMeters } from '../utils/mathUtils';

// Importar expo-location solo en native
let Location = null;
if (Platform.OS !== 'web') {
  try {
    Location = require('expo-location');
  } catch (e) {
    console.warn('expo-location not available:', e);
  }
}

import { FontAwesome5 } from '@expo/vector-icons';
import GlassPanel from '../components/GlassPanel';
import DeliveryMap from '../components/DeliveryMap';
import ScannerModal from '../components/ScannerModal';
import { useDataSync } from '../contexts/AppContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { CONFIG } from '../constants/Config';
import { useOrder } from '../contexts/OrderContext';
import { useUser } from '../contexts/UserContext';
import { getThemeColors, shadows, glass } from '../theme/theme';
import AccessDeniedScreen from '../components/AccessDeniedScreen';

const { height, width } = Dimensions.get('window');

const DeliveryTrackingScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { isAutoSyncEnabled } = useDataSync();
  const { role, username, userId, email } = useUser();

  const isStaff = useMemo(() => {
    const currentRole = role || '';
    return ['admin', 'staff', 'waiter', 'owner', 'delivery', 'repartidor'].includes(currentRole.toLowerCase());
  }, [role]);
  
  const orderId = route.params?.orderId || "DS-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  const { orderDetails, loading, loadOrderDetails, refreshOrder } = useOrder();
  
  const isAuthorized = useMemo(() => {
    if (loading || !orderDetails) return true; // Wait for loading
    if (isStaff) return true;
    
    // Check ownership
    const orderEmail = (orderDetails.email || orderDetails.Email || '').toLowerCase().trim();
    const myEmail = (email || '').toLowerCase().trim();
    if (orderEmail && myEmail && orderEmail === myEmail) return true;
    
    if (orderDetails.userId && userId && String(orderDetails.userId) === String(userId)) return true;
    
    return false;
  }, [loading, orderDetails, isStaff, email, userId]);

  const [routeData, setRouteData] = useState(null);
  const [fetchingRoute, setFetchingRoute] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState(null);

  if (!loading && !isAuthorized) {
    return <AccessDeniedScreen navigation={navigation} message={`No tienes permiso para ver o rastrear el pedido ${orderId}.`} />;
  }

  // Ubicaciones
  const storeLocation = CONFIG.STORE_LOCATION;
  
  const tipoEntrega = (orderDetails?.tipo || 'Domicilio').toLowerCase();
  const isDelivery = tipoEntrega === 'domicilio' || tipoEntrega === 'delivery' || tipoEntrega === 'envio' || tipoEntrega === 'envío';

  const clientLocation = useMemo(() => {
    // Para pedidos pickup/local, usar la ubicación del dispositivo si está disponible
    if (!isDelivery && deviceLocation) {
      console.log('[DeliveryTracking] Using device location for pickup:', deviceLocation);
      return deviceLocation;
    }
    
    let loc = orderDetails?.location || { 
      latitude: route.params?.lat || CONFIG.STORE_LOCATION.latitude, 
      longitude: route.params?.lng || CONFIG.STORE_LOCATION.longitude 
    };

    if (typeof loc === 'string') {
      try {
        const [lat, lng] = loc.split(',').map(n => parseFloat(n.trim()));
        loc = { latitude: lat, longitude: lng };
      } catch (e) {
        console.error("Error parsing location string:", loc, e);
      }
    }
    
    const result = {
      latitude: Number(loc.latitude) || CONFIG.STORE_LOCATION.latitude,
      longitude: Number(loc.longitude) || CONFIG.STORE_LOCATION.longitude
    };
    
    console.log('[DeliveryTracking] clientLocation:', {
      fromOrder: !!orderDetails?.location,
      fromParams: !!(route.params?.lat && route.params?.lng),
      fromDevice: !isDelivery && !!deviceLocation,
      result
    });
    
    return result;
  }, [orderDetails, route.params, isDelivery, deviceLocation]);

  // Cargar ruta real de Google
  useEffect(() => {
    if (!orderDetails) return;
    
    const fetchRealRoute = async () => {
      // Para pickup/local, SOLO usar ubicación del dispositivo (GPS)
      // orderDetails.location es la dirección del cliente (casa), no sirve para recogida
      if (!isDelivery && !deviceLocation) {
        console.log('[DeliveryTracking] Pickup sin GPS aún, esperando...');
        return;
      }
      
      const currentClientLocation = (!isDelivery && deviceLocation) ? deviceLocation : clientLocation;
      
      if (!currentClientLocation || !storeLocation) return;
      
      // Para delivery: store → client. Para pickup: client → store
      const origin = isDelivery ? storeLocation : currentClientLocation;
      const destination = isDelivery ? currentClientLocation : storeLocation;
      
      const originDistMeters = getDistanceMeters(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
      
      // Si origen y destino son casi iguales, no fetcheear
      if (originDistMeters < 10) {
        console.log('[DeliveryTracking] Origin and destination too close:', Math.round(originDistMeters) + ' m');
        return;
      }
      
      console.log('[DeliveryTracking] Fetching route:', { origin, destination, isDelivery, originDist: Math.round(originDistMeters) + ' m', hasDeviceLocation: !!deviceLocation });
      setFetchingRoute(true);
      const data = await getRouteDetails(origin, destination);
      console.log('[DeliveryTracking] Route data:', data ? { distance: data.distance, duration: data.duration, hasPolyline: !!data.polyline } : 'null');
      if (data) {
        setRouteData(data);
      }
      setFetchingRoute(false);
    };

    fetchRealRoute();
  }, [orderDetails, clientLocation, isDelivery, deviceLocation]);

  // Obtener ubicación del dispositivo para pedidos pickup/local
  useEffect(() => {
    const getDeviceLocation = async () => {
      if (isDelivery) return;
      
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          console.log('[DeliveryTracking] Geolocation not available on web');
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (position.coords.accuracy > 1000) {
              console.warn('[DeliveryTracking] GPS accuracy too low:', position.coords.accuracy, 'm — skipping device location');
              return;
            }
            setDeviceLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            console.log('[DeliveryTracking] Web device location:', position.coords);
          },
          (error) => {
            console.error('[DeliveryTracking] Web geolocation error:', error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[DeliveryTracking] Permiso de ubicación denegado');
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setDeviceLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        console.log('[DeliveryTracking] Device location:', location.coords);
      } catch (error) {
        console.error('[DeliveryTracking] Error getting device location:', error);
      }
    };
    
    getDeviceLocation();
  }, [isDelivery]);

  const distance = useMemo(() =>
    routeData?.distance || getDistance(storeLocation.latitude, storeLocation.longitude, clientLocation.latitude, clientLocation.longitude),
    [clientLocation, routeData]
  );
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [riderLocation, setRiderLocation] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    floatingHeader: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 40,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
      ...shadows.medium
    },
    headerBadge: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    headerOrderId: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary },
    mapWrapper: {
      height: Platform.OS === 'web' && width > 768 ? height : height * 0.45,
      width: '100%',
    },
    etaSection: {
      position: 'absolute',
      top: 110,
      alignSelf: 'center',
      zIndex: 5,
    },
    etaContainer: {
      paddingHorizontal: 25,
      paddingVertical: 12,
      borderRadius: 25,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    etaLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700', color: colors.text.secondary },
    etaTime: { fontSize: 24, fontWeight: '900', marginTop: 2, color: colors.primary },
    infoSheet: {
      flex: Platform.OS === 'web' && width > 768 ? 0 : 1,
      width: Platform.OS === 'web' && width > 768 ? 450 : '100%',
      height: Platform.OS === 'web' && width > 768 ? height - 100 : 'auto',
      position: Platform.OS === 'web' && width > 768 ? 'absolute' : 'relative',
      top: Platform.OS === 'web' && width > 768 ? 50 : 0,
      right: Platform.OS === 'web' && width > 768 ? 50 : 0,
      borderRadius: 25,
      paddingHorizontal: 20,
      paddingTop: 15,
      ...shadows.large,
      backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: Platform.OS === 'web' ? 'blur(10px)' : 'none',
    },
    dragHandle: {
      width: 40,
      height: 6,
      backgroundColor: 'rgba(0,0,0,0.1)',
      borderRadius: 3,
      alignSelf: 'center',
      marginBottom: 20,
    },
    deliveryStatusContainer: { marginBottom: 15 },
    statusTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4, color: colors.text.primary },
    deliveryAddress: { fontSize: 13, lineHeight: 18, color: colors.text.secondary },
    stepsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    stepItem: { alignItems: 'center', zIndex: 2 },
    stepIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
      ...shadows.small,
    },
    stepText: { fontSize: 11, textAlign: 'center' },
    stepConnector: {
      flex: 1,
      height: 3,
      borderRadius: 1.5,
      marginHorizontal: -15,
      marginTop: -25,
      zIndex: 1,
    },
    riderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 20,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    riderAvatarContainer: { position: 'relative', marginRight: 12 },
    riderAvatar: { width: 50, height: 50, borderRadius: 25 },
    riderStatusDot: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    riderInfo: { flex: 1 },
    riderLabel: { fontSize: 10, letterSpacing: 1.5, marginBottom: 4, color: colors.primary, fontWeight: '800' },
    riderName: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5, color: colors.text.primary },
    riderPhoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    premiumRatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      backgroundColor: darkMode ? 'rgba(255,215,0,0.1)' : 'rgba(255,215,0,0.15)',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: 'rgba(255,215,0,0.3)',
    },
    premiumRatingItem: { flexDirection: 'row', alignItems: 'center' },
    premiumRatingText: { fontSize: 13, fontWeight: '900', marginLeft: 6, color: colors.text.primary },
    ratingSeparator: { width: 1, height: 12, marginHorizontal: 10, backgroundColor: 'rgba(0,0,0,0.1)' },
    deliveriesText: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase' },
    riderVehiculo: { fontSize: 13, fontWeight: '500', color: colors.text.secondary, marginLeft: 6 },
    riderActions: { alignItems: 'center', justifyContent: 'center', paddingLeft: 10 },
    actionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.small,
    },
    detailsBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: 25,
      padding: 24,
      marginTop: 10,
      borderColor: colors.border,
      backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    },
    detailsBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, color: colors.text.secondary },
    receiveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      borderRadius: 25,
      marginTop: 20,
      gap: 12,
      ...shadows.medium,
    },
    receiveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 }
  }), [colors, darkMode]);

  useEffect(() => {
    loadOrderDetails(orderId);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' })
    ]).start();
    let interval = null;
    if (isAutoSyncEnabled) {
      interval = setInterval(() => { refreshOrder(orderId); }, 30000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [orderId, isAutoSyncEnabled]);

  useEffect(() => {
    if (route.params?.autoOpenScanner) {
      openScanner();
    }
  }, [route.params?.autoOpenScanner]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || isProcessingQR) return;
    setScanned(true);
    setIsProcessingQR(true);

    try {
      const payload = JSON.parse(data);
      
      // Validar que sea un QR de DSicario y para esta orden
      if (payload.action === 'confirm_delivery' && String(payload.orderId) === String(orderId)) {
        await updateOrderStatus(orderId, 'delivered');
        await refreshOrder(orderId);
        
        setIsScannerVisible(false);
        
        const isCash = payload.paymentMethod?.toLowerCase().includes('efectivo');
        const message = isCash ? '¡RECIBIDO Y PAGADO ✅! Gracias por tu preferencia.' : '¡RECIBIDO ✅! Esperamos que disfrutes tu pedido.';
        
        showAlert('Éxito', message);
      } else {
        showAlert('Error', 'Este código no corresponde a tu pedido actual.');
        setScanned(false);
      }
    } catch (error) {
      console.error("Error scanning QR:", error);
      showAlert('Error', 'Código no válido.');
      setScanned(false);
    } finally {
      setIsProcessingQR(false);
    }
  };

  const openScanner = async () => {
    if (!permission || !permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        showAlert('Permiso denegado', 'Necesitamos acceso a la cámara para confirmar la entrega.');
        return;
      }
    }
    setScanned(false);
    setIsScannerVisible(true);
  };



  const steps = useMemo(() => [
    { key: 'preparing', label: 'Cocinando', icon: 'utensils' },
    { key: 'on_the_way', label: isDelivery ? 'En camino' : 'Listo para retirar', icon: isDelivery ? 'motorcycle' : 'store' },
    { key: 'delivered', label: isDelivery ? '¡Aquí está!' : '¡Retirado!', icon: 'check-circle' },
  ], [isDelivery]);

  const getStatusIndex = (status) => {
    switch(status) {
      case 'preparing': return 0;
      case 'ready':
      case 'on_the_way': return 1;
      case 'delivered': return 2;
      default: return 0;
    }
  };

  const currentStepIndex = getStatusIndex(orderDetails?.estado);

  if (loading || !orderDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.text.secondary }}>Cargando ruta mágica...</Text>
      </View>
    );
  }

  // Verificar propiedad: clientes solo pueden ver sus propios pedidos
  if (!isStaff) {
    const orderUserId = orderDetails.id_user || orderDetails.ID_Usuario || '';
    const currentUserId = userId || email || '';
    const isOwner = orderUserId && currentUserId &&
      (String(orderUserId).toLowerCase() === String(currentUserId).toLowerCase());
    if (!isOwner) {
      return <AccessDeniedScreen navigation={navigation} message="No tienes permiso para ver los detalles de este pedido." />;
    }
  }



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.floatingHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <GlassPanel intensity={10} style={styles.headerBadge}>
          <Text style={styles.headerOrderId}>Orden {orderId}</Text>
        </GlassPanel>
        <TouchableOpacity 
          onPress={() => refreshOrder(orderId)} 
          style={[styles.backButton, { backgroundColor: colors.primary + '20' }]}
        >
          <FontAwesome5 name="sync-alt" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.mapWrapper}>
          <DeliveryMap 
            darkMode={darkMode} 
            colors={colors} 
            origin={isDelivery ? CONFIG.STORE_LOCATION : (deviceLocation || CONFIG.STORE_LOCATION)}
            destination={isDelivery ? clientLocation : CONFIG.STORE_LOCATION}
            routeData={routeData}
            isPickup={!isDelivery}
            pulseAnim={pulseAnim} 
            progreso={orderDetails?.progreso || 0.4} 
          />
          <Animated.View style={[styles.etaSection, { opacity: fadeAnim, transform: [{ scale: fadeAnim }, { translateY: pulseAnim.interpolate({ inputRange: [1, 1.1], outputRange: [0, -5] }) }] }]}>
            <GlassPanel intensity={40} style={styles.etaContainer}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.etaLabel, { color: colors.primary, fontWeight: '900' }]}>
                  {isDelivery ? 'LLEGADA ESTIMADA' : !isDelivery ? 'RECOGIDA ESTIMADA' : 'UBICACIÓN DEL LOCAL'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <FontAwesome5 name="clock" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.etaTime, { fontSize: 28 }]}>{routeData?.duration || orderDetails?.eta || '20 min'}</Text>
                </View>
                {routeData?.distance && (
                   <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 4, fontWeight: '600' }}>
                     A {routeData.distance} de distancia
                   </Text>
                )}
              </View>
            </GlassPanel>
          </Animated.View>
        </View>

      <Animated.View style={[styles.infoSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.dragHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.deliveryStatusContainer}>
            <Text style={styles.statusTitle}>
              {currentStepIndex === 1 ? '¡Tu pedido está volando!' : currentStepIndex === 2 ? '¡Pedido entregado con éxito!' : 'Estamos preparando tu delicia'}
            </Text>
            <Text style={styles.deliveryAddress}>
              <FontAwesome5 name="map-marker-alt" color={colors.error} /> {String(orderDetails?.direccion || '').split('|').pop().trim() || 'Buscando dirección...'}
            </Text>
          </View>
          <View style={styles.stepsContainer}>
            {steps.map((step, i) => {
              const isActive = i === currentStepIndex;
              const isCompleted = i < currentStepIndex;
              return (
                <View key={step.key} style={{ flexDirection: 'row', flex: i < steps.length - 1 ? 1 : 0, alignItems: 'center' }}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepIcon, isCompleted && { backgroundColor: colors.success }, isActive && { backgroundColor: colors.primary, transform: [{ scale: 1.1 }] }]}>
                      <FontAwesome5 name={step.icon} size={16} color={isCompleted || isActive ? '#FFF' : colors.text.light} />
                    </View>
                    <Text style={[styles.stepText, { color: isActive || isCompleted ? colors.text.primary : colors.text.light }, isActive && { fontWeight: 'bold' }]}>{step.label}</Text>
                  </View>
                  {i < steps.length - 1 && (
                    <View style={[styles.stepConnector, { backgroundColor: isCompleted ? colors.success : colors.border }]} />
                  )}
                </View>
              );
            })}
          </View>
          {isDelivery && (
            <GlassPanel intensity={20} style={styles.riderCard}>
              <View style={styles.riderAvatarContainer}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80' }} style={styles.riderAvatar} />
                <View style={[styles.riderStatusDot, { backgroundColor: colors.success }]} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderLabel}>TU REPARTIDOR</Text>
                <Text style={styles.riderName}>{orderDetails?.nombre || 'Juan'} {orderDetails?.apellido || 'Pérez'}</Text>
                <View style={styles.riderPhoneRow}>
                  <FontAwesome5 name="motorcycle" size={12} color={colors.text.secondary} />
                  <Text style={styles.riderVehiculo}>{orderDetails?.vehiculo || 'Honda Super Cub'}</Text>
                </View>
                <View style={styles.premiumRatingRow}>
                  <View style={styles.premiumRatingItem}>
                    <FontAwesome5 name="star" size={10} color={colors.warning} solid /><Text style={styles.premiumRatingText}>4.9</Text>
                  </View>
                  <View style={styles.ratingSeparator} />
                  <Text style={styles.deliveriesText}>1.2k pedidos</Text>
                </View>
              </View>
              <View style={styles.riderActions}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(`tel:${orderDetails?.telefono}`)} activeOpacity={0.7}><FontAwesome5 name="phone" size={16} color="#FFF" /></TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#25D366', marginTop: 12 }]} onPress={() => Linking.openURL(`https://wa.me/${orderDetails?.whatsapp?.replace(/\D/g,'')}`)} activeOpacity={0.7}><FontAwesome5 name="whatsapp" size={18} color="#FFF" /></TouchableOpacity>
              </View>
            </GlassPanel>
          )}
          
          {currentStepIndex === 1 && isDelivery && (
            <TouchableOpacity 
              style={[styles.receiveBtn, { backgroundColor: colors.success }]} 
              onPress={openScanner}
            >
              <FontAwesome5 name="qrcode" size={18} color="#FFF" />
              <Text style={styles.receiveBtnText}>RECIBIR PEDIDO</Text>
            </TouchableOpacity>
          )}

          {currentStepIndex === 1 && !isDelivery && isStaff && (
            <TouchableOpacity 
              style={[styles.receiveBtn, { backgroundColor: colors.success }]} 
              onPress={async () => {
                setIsProcessingQR(true);
                try {
                  await updateOrderStatus(orderId, 'delivered', { 
                    entregadoPor: username || 'Empleado' 
                  });
                  await refreshOrder(orderId);
                  showAlert('Éxito', 'Pedido entregado en local correctamente.');
                } catch (e) {
                  showAlert('Error', 'No se pudo confirmar la entrega.');
                } finally {
                  setIsProcessingQR(false);
                }
              }}
            >
              <FontAwesome5 name="check-circle" size={18} color="#FFF" />
              <Text style={styles.receiveBtnText}>ENTREGAR PEDIDO</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.detailsBtn} onPress={() => setShowInvoiceModal(true)}><Text style={styles.detailsBtnText}>Detalles de la Factura</Text><FontAwesome5 name="chevron-right" size={12} color={colors.text.light} /></TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* 🧾 MODAL DE DETALLE DE FACTURA */}
      <Modal visible={showInvoiceModal} transparent animationType="slide" onRequestClose={() => setShowInvoiceModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ 
            backgroundColor: colors.surface, 
            borderTopLeftRadius: 24, 
            borderTopRightRadius: 24, 
            maxHeight: '85%',
            paddingTop: 20,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary }}>Resumen del Pedido</Text>
              <TouchableOpacity onPress={() => setShowInvoiceModal(false)} style={{ padding: 8 }}>
                <FontAwesome5 name="times" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
              {/* ID y Estado */}
              <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 15, marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: colors.text.secondary }}>Pedido</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>#{orderDetails?.id || orderId}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 14, color: colors.text.secondary }}>Estado</Text>
                  <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>{orderDetails?.estado || 'En proceso'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 14, color: colors.text.secondary }}>Hora</Text>
                  <Text style={{ fontSize: 14, color: colors.text.primary }}>{orderDetails?.hora || 'N/A'}</Text>
                </View>
              </View>

              {/* Cliente */}
              <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 15, marginBottom: 15 }}>
                <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 8 }}>Cliente</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.primary }}>{orderDetails?.cliente || 'Invitado'}</Text>
                <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 4 }}>
                  {String(orderDetails?.direccion || '').split('|').pop().trim() || 'Sin dirección'}
                </Text>
              </View>

              {/* Tipo de Entrega */}
              <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 15, marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: colors.text.secondary }}>Tipo de Entrega</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                    {orderDetails?.tipo === 'delivery' || orderDetails?.tipo === 'domicilio' ? '🏠 Domicilio' : 
                     orderDetails?.tipo === 'pickup' ? '🏪 Recogida' : '🍽️ En Local'}
                  </Text>
                </View>
              </View>

              {/* Items */}
              {orderDetails?.items && orderDetails.items.length > 0 && (
                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 15, marginBottom: 15 }}>
                  <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 12 }}>Productos</Text>
                  {orderDetails.items.map((item, index) => (
                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: index < orderDetails.items.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>
                          {item.nombre || item.name || 'Producto'}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                          Cant: {item.cantidad || item.quantity || 1}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text.primary }}>
                        RD$ {((item.precio || item.price || 0) * (item.cantidad || item.quantity || 1)).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Total */}
              <View style={{ backgroundColor: colors.primary + '10', borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: colors.primary + '30' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>Total</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }}>RD$ {(orderDetails?.total || 0).toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 📸 MODAL DE ESCÁNER QR MODULARIZADO */}
      <ScannerModal 
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onScan={handleBarCodeScanned}
        scanned={scanned}
        isProcessing={isProcessingQR}
        colors={colors}
      />
    </SafeAreaView>
  );
};

export default DeliveryTrackingScreen;
