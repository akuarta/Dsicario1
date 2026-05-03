import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Image,
  SafeAreaView,
  Animated,
  Platform,
  Linking,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { updateOrderStatus, getRouteDetails } from '../utils/api';
import { getDistance } from '../utils/mathUtils';

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

const { height, width } = Dimensions.get('window');

const DeliveryTrackingScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { isAutoSyncEnabled } = useDataSync();
  const { role, username } = useUser();

  const isStaff = useMemo(() => {
    const currentRole = role || '';
    return ['admin', 'staff', 'waiter', 'owner'].includes(currentRole.toLowerCase());
  }, [role]);
  
  const orderId = route.params?.orderId || "DS-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  const { orderDetails, loading, loadOrderDetails, refreshOrder } = useOrder();
  
  const [routeData, setRouteData] = useState(null);
  const [fetchingRoute, setFetchingRoute] = useState(false);

  // Ubicaciones
  const storeLocation = CONFIG.STORE_LOCATION;
  const clientLocation = useMemo(() => orderDetails?.location || { 
    latitude: route.params?.lat || 18.486, 
    longitude: route.params?.lng || -69.931 
  }, [orderDetails, route.params]);

  const tipoEntrega = (orderDetails?.tipo || 'Domicilio').toLowerCase();
  const isDelivery = tipoEntrega === 'domicilio' || tipoEntrega === 'delivery' || tipoEntrega === 'envio' || tipoEntrega === 'envío';

  // Cargar ruta real de Google
  useEffect(() => {
    const fetchRealRoute = async () => {
      if (!clientLocation || !storeLocation) return;
      
      setFetchingRoute(true);
      const origin = isDelivery ? storeLocation : clientLocation;
      const destination = isDelivery ? clientLocation : storeLocation;
      
      const data = await getRouteDetails(origin, destination);
      if (data) {
        setRouteData(data);
      }
      setFetchingRoute(false);
    };

    fetchRealRoute();
  }, [clientLocation, isDelivery]);

  const distance = useMemo(() => 
    routeData?.distance || getDistance(storeLocation.latitude, storeLocation.longitude, clientLocation.latitude, clientLocation.longitude) + " km",
    [clientLocation, routeData]
  );
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [showMapForLocal, setShowMapForLocal] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    floatingHeader: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 40 : 10,
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
      height: height * 0.45,
      width: '100%',
    },
    etaSection: {
      position: 'absolute',
      top: 100,
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
      flex: 1,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      marginTop: -25,
      paddingHorizontal: 16,
      paddingTop: 8,
      ...shadows.large,
      backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
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
      height: 4,
      borderRadius: 2,
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
      backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    premiumRatingItem: { flexDirection: 'row', alignItems: 'center' },
    premiumRatingText: { fontSize: 12, fontWeight: '700', marginLeft: 4, color: colors.text.primary },
    ratingSeparator: { width: 1, height: 12, marginHorizontal: 8, backgroundColor: colors.border },
    deliveriesText: { fontSize: 11, fontWeight: '500', color: colors.text.light },
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
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true })
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
        
        Alert.alert('Éxito', message);
      } else {
        Alert.alert('Error', 'Este código no corresponde a tu pedido actual.');
        setScanned(false);
      }
    } catch (error) {
      console.error("Error scanning QR:", error);
      Alert.alert('Error', 'Código no válido.');
      setScanned(false);
    } finally {
      setIsProcessingQR(false);
    }
  };

  const openScanner = async () => {
    if (!permission || !permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para confirmar la entrega.');
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

  if (loading && !orderDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.text.secondary }}>Cargando ruta mágica...</Text>
      </View>
    );
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
        <View style={{ width: 44 }} />
      </View>

      {isDelivery || showMapForLocal ? (
        <View style={styles.mapWrapper}>
          <DeliveryMap 
            darkMode={darkMode} 
            colors={colors} 
            origin={isDelivery ? CONFIG.STORE_LOCATION : clientLocation}
            destination={isDelivery ? clientLocation : CONFIG.STORE_LOCATION} 
            routeData={routeData}
            isPickup={!isDelivery}
            pulseAnim={pulseAnim} 
            progreso={orderDetails?.progreso || 0.4} 
          />
          <Animated.View style={[styles.etaSection, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
            <GlassPanel intensity={35} style={styles.etaContainer}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.etaLabel}>{isDelivery ? 'LLEGADA ESTIMADA' : 'RECOGIDA ESTIMADA'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <FontAwesome5 name="clock" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.etaTime}>{routeData?.duration || orderDetails?.eta || '20 min'}</Text>
                </View>
              </View>
            </GlassPanel>
          </Animated.View>
          {showMapForLocal && !isDelivery && (
            <TouchableOpacity 
              style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, right: 20, backgroundColor: colors.surface, padding: 12, borderRadius: 20, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 5 }}
              onPress={() => setShowMapForLocal(false)}
            >
              <FontAwesome5 name="times" size={18} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={[styles.mapWrapper, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <FontAwesome5 name="store-alt" size={50} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text.primary }}>Recogida en Local</Text>
          <Text style={{ marginTop: 10, fontSize: 15, color: colors.text.secondary, textAlign: 'center', paddingHorizontal: 40, marginBottom: 30 }}>
            Tu pedido se preparará en nuestro establecimiento. Acércate al mostrador cuando esté listo.
          </Text>

          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: 15 }}>
            ¿Sabes llegar al local?
          </Text>
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity 
              style={{ paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary }}
              onPress={() => {
                // Ya no hace falta mostrar mapa si sabe llegar
                // Se queda en esta misma vista
                Alert.alert("¡Genial!", "Te esperamos en nuestro local para entregarte tu pedido.");
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Sí</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, backgroundColor: colors.primary }}
              onPress={() => setShowMapForLocal(true)}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>No, ver mapa</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Animated.View style={[styles.infoSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.dragHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.deliveryStatusContainer}>
            <Text style={styles.statusTitle}>
              {currentStepIndex === 1 ? '¡Tu pedido está volando!' : currentStepIndex === 2 ? '¡Pedido entregado con éxito!' : 'Estamos preparando tu delicia'}
            </Text>
            <Text style={styles.deliveryAddress}>
              <FontAwesome5 name="map-marker-alt" color={colors.error} /> {orderDetails?.direccion || 'Buscando dirección...'}
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
                  Alert.alert('Éxito', 'Pedido entregado en local correctamente.');
                } catch (e) {
                  Alert.alert('Error', 'No se pudo confirmar la entrega.');
                } finally {
                  setIsProcessingQR(false);
                }
              }}
            >
              <FontAwesome5 name="check-circle" size={18} color="#FFF" />
              <Text style={styles.receiveBtnText}>ENTREGAR PEDIDO</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.detailsBtn} onPress={() => navigation.navigate('Config')}><Text style={styles.detailsBtnText}>Detalles de la Factura</Text><FontAwesome5 name="chevron-right" size={12} color={colors.text.light} /></TouchableOpacity>
        </ScrollView>
      </Animated.View>

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
