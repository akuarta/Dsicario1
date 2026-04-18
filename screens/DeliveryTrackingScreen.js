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
  ActivityIndicator
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassPanel from '../components/GlassPanel';
import DeliveryMap from '../components/DeliveryMap';
import { useDataSync } from '../contexts/AppContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useOrder } from '../contexts/OrderContext';
import { getThemeColors, shadows, glass } from '../theme/theme';

const { height, width } = Dimensions.get('window');

const DeliveryTrackingScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  const orderId = route.params?.orderId || "DS-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  const { orderDetails, loading, loadOrderDetails, refreshOrder } = useOrder();
  const { isAutoSyncEnabled } = useDataSync();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    etaLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700', color: colors.text.secondary },
    etaTime: { fontSize: 24, fontWeight: '900', marginTop: 2, color: colors.primary },
    infoSheet: {
      flex: 1,
      borderTopLeftRadius: 35,
      borderTopRightRadius: 35,
      marginTop: -40,
      paddingHorizontal: 24,
      paddingTop: 16,
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
    deliveryStatusContainer: { marginBottom: 30 },
    statusTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: colors.text.primary },
    deliveryAddress: { fontSize: 14, lineHeight: 20, color: colors.text.secondary },
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
      padding: 18,
      borderRadius: 30,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: colors.border
    },
    riderAvatarContainer: { position: 'relative', marginRight: 15 },
    riderAvatar: { width: 65, height: 65, borderRadius: 32.5 },
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
    detailsBtnText: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, color: colors.text.secondary }
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

      <View style={styles.mapWrapper}>
        <DeliveryMap darkMode={darkMode} colors={colors} pulseAnim={pulseAnim} progreso={orderDetails?.progreso || 0.4} />
        <Animated.View style={[styles.etaSection, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
          <GlassPanel intensity={35} style={styles.etaContainer}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.etaLabel}>LLEGADA ESTIMADA</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <FontAwesome5 name="clock" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.etaTime}>{orderDetails?.eta || '20 min'}</Text>
              </View>
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
          <TouchableOpacity style={styles.detailsBtn} onPress={() => navigation.navigate('Config')}><Text style={styles.detailsBtnText}>Detalles de la Factura</Text><FontAwesome5 name="chevron-right" size={12} color={colors.text.light} /></TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

export default DeliveryTrackingScreen;
