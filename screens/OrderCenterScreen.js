import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows, glass } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { useDataSync } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

const OrderCenterScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { email, role } = useUser();
  const { kitchenOrders, isSyncing, syncAllData } = useDataSync();

  const isEmployee = !!(role && ['admin', 'cocina', 'delivery', 'mesero'].includes(role.toLowerCase()));
  const [refreshing, setRefreshing] = useState(false);
  
  // Animación para las tarjetas
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllData();
    setRefreshing(false);
  }, []);

  // Filtrar pedidos según rol
  const filteredOrders = kitchenOrders.filter(o => 
    isEmployee || (o.email && o.email.toLowerCase() === email.toLowerCase())
  );

  // Filtrar pedidos Activos vs Recientes dentro de los filtrados
  const activeOrders = filteredOrders.filter(o => 
    ['pending', 'preparing', 'ready', 'on_the_way'].includes((o.estado || '').toLowerCase())
  );
  
  const completedOrders = filteredOrders.filter(o => 
    ['delivered'].includes((o.estado || '').toLowerCase())
  ).slice(0, 5);

  const getStatusInfo = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return { label: 'Recibido', color: colors.warning || '#FFC107', icon: 'clock' };
    if (s === 'preparing') return { label: 'En Cocina', color: colors.primary || '#E63946', icon: 'fire' };
    if (s === 'ready') return { label: 'Listo p/ Despacho', color: colors.success || '#4CAF50', icon: 'check-circle' };
    if (s === 'on_the_way') return { label: 'En Camino 🛵', color: '#2196F3', icon: 'motorcycle' };
    if (s === 'delivered') return { label: '¡Entregado!', color: '#FFD700', icon: 'home' };
    return { label: 'Procesando', color: colors.text.secondary || '#666', icon: 'ellipsis-h' };
  };

  const renderActiveOrder = (order) => {
    const status = getStatusInfo(order.estado);
    const s = (order.estado || '').toLowerCase();
    
    // Calcular paso activo para la visualización
    let activeStep = 0;
    if (s === 'preparing') activeStep = 1;
    if (s === 'ready') activeStep = 2;
    if (s === 'on_the_way') activeStep = 3;
    if (s === 'delivered') activeStep = 4;
    return (
      <GlassPanel key={order.id} intensity={20} style={styles.activeCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.orderId, { color: colors.text.primary }]}>Orden #{order.id}</Text>
            <Text style={[styles.statusLabel, { color: status.color }]}>
              <FontAwesome5 name={status.icon} size={12} /> {status.label}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.trackBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('DeliveryTracking', { orderId: order.id })}
          >
            <Text style={styles.trackBtnText}>Ver Mapa</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline Maestro de 5 Pasos */}
        <View style={styles.timelineRow}>
          {/* Paso 1: Recibido */}
          <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
          <View style={[styles.timelineLine, { backgroundColor: activeStep >= 1 ? colors.primary : colors.border }]} />
          
          {/* Paso 2: Cocina */}
          <View style={[styles.timelineDot, { backgroundColor: activeStep >= 1 ? colors.primary : colors.border }]} />
          <View style={[styles.timelineLine, { backgroundColor: activeStep >= 2 ? colors.success : colors.border }]} />
          
          {/* Paso 3: Listo */}
          <View style={[styles.timelineDot, { backgroundColor: activeStep >= 2 ? colors.success : colors.border }]} />
          <View style={[styles.timelineLine, { backgroundColor: activeStep >= 3 ? '#2196F3' : colors.border }]} />
          
          {/* Paso 4: En Camino */}
          <View style={[styles.timelineDot, { backgroundColor: activeStep >= 3 ? '#2196F3' : colors.border }]} />
          <View style={[styles.timelineLine, { backgroundColor: activeStep >= 4 ? '#FFD700' : colors.border }]} />
          
          {/* Paso 5: Entregado */}
          <View style={[styles.timelineDot, { backgroundColor: activeStep >= 4 ? '#FFD700' : colors.border }]} />
        </View>

        <Text style={[styles.itemSummary, { color: colors.text.secondary }]} numberOfLines={1}>
          {order.items?.map(i => i.nombre || i.name || 'Producto').join(', ')}
        </Text>
      </GlassPanel>
    );
  };

  const renderRecentOrder = (order) => {
    return (
      <TouchableOpacity 
        key={order.id} 
        style={[styles.recentItem, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate('DeliveryTracking', { orderId: order.id })}
      >
        <View style={styles.recentIcon}>
          <FontAwesome5 name="history" size={14} color={colors.text.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.recentTitle, { color: colors.text.primary }]}>Orden #{order.id}</Text>
          <Text style={[styles.recentDate, { color: colors.text.light }]}>{order.hora || 'Recientemente'}</Text>
        </View>
        <FontAwesome5 name="chevron-right" size={12} color={colors.text.light} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Centro de Pedidos</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <FontAwesome5 name="sync" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <Text style={styles.sectionTitle}>Pedidos en Curso</Text>
        {activeOrders.length > 0 ? (
          activeOrders.map(renderActiveOrder)
        ) : (
          <GlassPanel intensity={10} style={styles.emptyCard}>
            <FontAwesome5 name="utensils" size={30} color={colors.border} />
            <Text style={styles.emptyText}>No tienes pedidos activos ahora</Text>
          </GlassPanel>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Registro de Rastreo</Text>
        <GlassPanel intensity={15} style={styles.recentList}>
          {completedOrders.length > 0 ? (
            completedOrders.map(renderRecentOrder)
          ) : (
            <Text style={styles.emptyTextSmall}>Aún no hay registros de rastreo</Text>
          )}
        </GlassPanel>

        <TouchableOpacity 
          style={[styles.historyBtn, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('PurchaseHistory')}
        >
          <Text style={[styles.historyBtnText, { color: colors.primary }]}>Ver Historial Completo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: spacing.sm },
  refreshBtn: { padding: spacing.sm },
  scrollContent: { padding: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 15, color: '#888' },
  activeCard: {
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  orderId: { fontSize: 16, fontWeight: 'bold' },
  statusLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  trackBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  trackBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { flex: 1, height: 2, marginHorizontal: -2 },
  itemSummary: { fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  emptyCard: { borderRadius: borders.radius.lg, padding: 30, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#555' },
  emptyText: { marginTop: 10, color: '#888', textAlign: 'center' },
  recentList: { borderRadius: borders.radius.xl, overflow: 'hidden' },
  recentItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1 },
  recentIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recentTitle: { fontSize: 14, fontWeight: '600' },
  recentDate: { fontSize: 10, marginTop: 2 },
  emptyTextSmall: { padding: 20, textAlign: 'center', color: '#666', fontSize: 12 },
  historyBtn: { marginTop: 30, borderWidth: 1, borderRadius: borders.radius.full, padding: 12, alignItems: 'center' },
  historyBtnText: { fontWeight: 'bold', fontSize: 14 },
});

export default OrderCenterScreen;
