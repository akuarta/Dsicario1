import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassPanel from '../components/GlassPanel';
import { useDataSync } from '../contexts/AppContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useOrder } from '../contexts/OrderContext';
import { shadows, glass } from '../theme';

const { height, width } = Dimensions.get('window');

const DeliveryTrackingScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const glassTokens = darkMode ? glass.dark : glass.light;
  
   const orderId = route.params?.orderId || "DS-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  const { orderDetails, loading, loadOrderDetails, refreshOrder } = useOrder();
  const { isAutoSyncEnabled } = useDataSync();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadOrderDetails(orderId);
    
    // Animación de pulso infinita
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Animación de entrada de la hoja de info
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();

    // Refresco automático cada 30 segundos (solo si está activado globalmente)
    let interval = null;
    if (isAutoSyncEnabled) {
      interval = setInterval(() => {
        refreshOrder(orderId);
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [orderId, isAutoSyncEnabled]);

  const steps = [
    { key: 'preparing', label: 'Cocinando', icon: 'utensils' },
    { key: 'on_the_way', label: 'En camino', icon: 'motorcycle' },
    { key: 'delivered', label: '¡Aquí está!', icon: 'check-circle' },
  ];

  const getStatusIndex = (status) => {
    switch(status) {
      case 'preparing': return 0;
      case 'on_the_way': return 1;
      case 'delivered': return 2;
      default: return 0;
    }
  };

  const currentStepIndex = getStatusIndex(orderDetails?.estado);

  const handleCallRider = () => {
    if (orderDetails?.telefonoRider) {
      Linking.openURL(`tel:${orderDetails.telefonoRider}`);
    }
  };

  if (loading && !orderDetails) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.text.secondary }}>Cargando ruta mágica...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header flotante minimalista */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backButton, { backgroundColor: colors.surface, ...shadows.medium }]}
        >
          <FontAwesome5 name="arrow-left" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <GlassPanel intensity={10} style={styles.headerBadge}>
          <Text style={[styles.headerOrderId, { color: colors.text.primary }]}>Orden {orderId}</Text>
        </GlassPanel>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.mapWrapper}>
        <DeliveryMap 
          darkMode={darkMode} 
          colors={colors} 
          pulseAnim={pulseAnim}
          progreso={orderDetails?.progreso || 0.4}
        />
        
        {/* ETA Overlay elegante */}
        <Animated.View style={[styles.etaSection, { opacity: fadeAnim }]}>
          <GlassPanel intensity={25} style={styles.etaContainer}>
            <Text style={[styles.etaLabel, { color: colors.text.secondary }]}>LLEGA EN</Text>
            <Text style={[styles.etaTime, { color: colors.primary }]}>{orderDetails?.eta || '20 min'}</Text>
          </GlassPanel>
        </Animated.View>
      </View>

      <Animated.View style={[
        styles.infoSheet, 
        { 
          backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          transform: [{ translateY: slideAnim }] 
        }
      ]}>
        <View style={styles.dragHandle} />
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.deliveryStatusContainer}>
            <Text style={[styles.statusTitle, { color: colors.text.primary }]}>
              {currentStepIndex === 1 ? '¡Tu pedido está volando!' : 
               currentStepIndex === 2 ? '¡Pedido entregado con éxito!' : 'Estamos preparando tu delicia'}
            </Text>
            <Text style={[styles.deliveryAddress, { color: colors.text.secondary }]}>
              <FontAwesome5 name="map-marker-alt" color={colors.error} /> {orderDetails?.direccion || 'Buscando dirección...'}
            </Text>
          </View>

          {/* Línea de tiempo visual */}
          <View style={styles.stepsContainer}>
            {steps.map((step, i) => {
              const isActive = i === currentStepIndex;
              const isCompleted = i < currentStepIndex;
              
              return (
                <React.Fragment key={step.key}>
                  <View style={styles.stepItem}>
                    <View style={[
                      styles.stepIcon, 
                      isCompleted && { backgroundColor: colors.success },
                      isActive && { backgroundColor: colors.primary, transform: [{ scale: 1.1 }] }
                    ]}>
                      <FontAwesome5 
                        name={step.icon} 
                        size={16} 
                        color={isCompleted || isActive ? '#FFF' : colors.text.light} 
                      />
                    </View>
                    <Text style={[
                      styles.stepText, 
                      { color: isActive || isCompleted ? colors.text.primary : colors.text.light },
                      isActive && { fontWeight: 'bold' }
                    ]}>{step.label}</Text>
                  </View>
                  {i < steps.length - 1 && (
                    <View style={[
                      styles.stepConnector, 
                      { backgroundColor: isCompleted ? colors.success : colors.border }
                    ]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Tarjeta del Repartidor - Sistema DSicario Real */}
          <GlassPanel intensity={15} style={styles.riderCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80' }} 
              style={styles.riderAvatar}
            />
            <View style={styles.riderInfo}>
              <Text style={[styles.riderLabel, { color: colors.text.secondary }]}>REPARTIDOR #{orderDetails?.deliveryId || 'DS001'}</Text>
              <Text style={[styles.riderName, { color: colors.text.primary }]}>{orderDetails?.nombre || 'Juan'} {orderDetails?.apellido || 'Pérez'}</Text>
              
              <View style={styles.riderPhoneRow}>
                <FontAwesome5 name="phone" size={10} color={colors.text.secondary} />
                <Text style={[styles.riderPhone, { color: colors.text.secondary }]}> {orderDetails?.telefono || '829-555-0123'}</Text>
              </View>

              {/* Sistema de Rating DSicario */}
              <View style={styles.ratingContainer}>
                <View style={styles.ratingItem}>
                  <FontAwesome5 name="wallet" size={10} color={colors.primary} />
                  <Text style={styles.ratingText}>{orderDetails?.cartera || 5.0}</Text>
                </View>
                <View style={styles.ratingItem}>
                  <FontAwesome5 name="running" size={10} color={colors.primary} />
                  <Text style={styles.ratingText}>{orderDetails?.rapidez || 4.8}</Text>
                </View>
                <View style={styles.ratingItem}>
                  <FontAwesome5 name="hands-helping" size={10} color={colors.primary} />
                  <Text style={styles.ratingText}>{orderDetails?.servicio || 4.9}</Text>
                </View>
                <View style={styles.ratingItem}>
                  <FontAwesome5 name="hand-holding-heart" size={10} color={colors.primary} />
                  <Text style={styles.ratingText}>{orderDetails?.honestidad || 5.0}</Text>
                </View>
              </View>

              <Text style={[styles.riderVehiculo, { color: colors.primary }]}>
                {orderDetails?.vehiculo || '🛵 Moto'}
              </Text>
            </View>
            
            <View style={styles.riderActions}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={() => Linking.openURL(`tel:${orderDetails?.telefono}`)}
              >
                <FontAwesome5 name="phone" size={16} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#25D366', marginTop: 10 }]}
                onPress={() => Linking.openURL(`https://wa.me/${orderDetails?.whatsapp?.replace(/\D/g,'')}`)}
              >
                <FontAwesome5 name="whatsapp" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </GlassPanel>

          <TouchableOpacity 
            style={[styles.detailsBtn, { borderColor: colors.border }]} 
            onPress={() => navigation.navigate('Configuracion')}
          >
            <Text style={[styles.detailsBtnText, { color: colors.text.secondary }]}>Detalles de la Factura</Text>
            <FontAwesome5 name="chevron-right" size={12} color={colors.text.light} />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
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
  },
  headerBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerOrderId: { fontSize: 14, fontWeight: 'bold' },
  mapWrapper: {
    height: height * 0.55,
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
  etaLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  etaTime: { fontSize: 24, fontWeight: '900', marginTop: 2 },
  infoSheet: {
    flex: 1,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    marginTop: -40,
    paddingHorizontal: 24,
    paddingTop: 16,
    ...shadows.large,
  },
  dragHandle: {
    width: 40,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  deliveryStatusContainer: { marginBottom: 30 },
  statusTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  deliveryAddress: { fontSize: 14, lineHeight: 20 },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 35,
    paddingHorizontal: 10,
  },
  stepItem: { alignItems: 'center', zIndex: 2 },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEE',
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
    padding: 16,
    borderRadius: 25,
    marginBottom: 25,
    borderWidth: 1,
  },
  riderAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  riderInfo: { flex: 1 },
  riderLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  riderName: { fontSize: 18, fontWeight: 'bold' },
  riderRating: { fontSize: 12, marginTop: 2 },
  callBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  detailsBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
    marginTop: 10,
  },
  detailsBtnText: { fontSize: 15, fontWeight: '600' }
});

export default DeliveryTrackingScreen;
