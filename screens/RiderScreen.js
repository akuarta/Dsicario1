import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  Modal,
  Switch
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { fetchRiderOrders, fetchRiderStats, updateOrderStatus, pickupOrder, formatPrice, respondToOffer, updateDelivery } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';
import GlassPanel from '../components/GlassPanel';
import { LinearGradient } from 'expo-linear-gradient';

const RiderScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  // Identificador del repartidor (deberÃ­a venir del login)
  const riderId = route.params?.riderId || 'DLV01'; 
    const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ cartera: 0, deuda: 0, cupo: 0, nombre: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ready'); 
  const { isAutoSyncEnabled } = useDataSync();
  const [proposal, setProposal] = useState(null); // Nuevo: Almacena la propuesta actual

  const [lastAssignedCount, setLastAssignedCount] = useState(0);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [orderData, statData] = await Promise.all([
        fetchRiderOrders(riderId),
        fetchRiderStats(riderId)
      ]);
      
      // REGION: DETECCION DE PROPUESTA (NEGOCIACION)
      const currentProposal = orderData.find(o => o.estado === 'propuesta' && o.id_rider === riderId);
      if (currentProposal && (!proposal || proposal.id !== currentProposal.id)) {
          setProposal(currentProposal);
      } else if (!currentProposal && proposal) {
          setProposal(null); // Limpiar si fue cancelada por el Admin
      }

      // NotificaciÃ³n estÃ¡ndar para pedidos ya listos
      const currentAssigned = orderData.filter(o => o.id_rider === riderId && o.estado === 'ready').length;
      if (currentAssigned > lastAssignedCount) {
          Alert.alert("🚀 ¡NUEVO PEDIDO!", "Un administrador te ha asignado un pedido.");
      }
      setLastAssignedCount(currentAssigned);

      setOrders(orderData);
      setStats(statData);
    } catch (error) {
      console.error('Error loading rider data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProposalResponse = async (accept) => {
    if (!proposal) return;
    setIsLoading(true);
    try {
        await respondToOffer(proposal.id, riderId, accept);
        setProposal(null);
        await loadData(true);
        if (accept) setActiveTab('ready');
    } catch (e) {
        console.error(e);
        Alert.alert('Error', 'No se pudo enviar la respuesta.');
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    let interval = null;
    if (isAutoSyncEnabled) {
      interval = setInterval(() => loadData(true), 10000); // Polling cada 10s para el repartidor
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isAutoSyncEnabled, lastAssignedCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, []);

  const toggleAvailability = async (value) => {
    try {
      // Usamos los datos completos que guardamos en stats.fullData
      const updatedRider = { 
        ...stats.fullData, 
        id_delivery: riderId,
        id: riderId,
        activo: value 
      };
      
      // Actualización optimista local
      setStats(prev => ({ ...prev, activo: value }));
      
      const res = await updateDelivery(updatedRider);
      
      if (res && (res.success || res.status === 'success')) {
        Alert.alert('Estado Actualizado', value ? 'Ahora estás disponible para recibir pedidos.' : 'Has pasado a modo fuera de servicio.');
      } else {
        // Si el servidor responde pero dice que falló
        setStats(prev => ({ ...prev, activo: !value }));
        Alert.alert('Error', 'El servidor no pudo guardar el cambio. Verifica tu conexión.');
      }
    } catch (e) {
      // Revertir en caso de error
      setStats(prev => ({ ...prev, activo: !value }));
      console.error(e);
      Alert.alert('Error', 'No se pudo actualizar tu disponibilidad.');
    }
  };

  // Filtrar Ã³rdenes por pestaÃ±a
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.estado === activeTab);
  }, [orders, activeTab]);

  const handleAction = (type, val) => {
    if (type === 'whatsapp') {
      const url = `whatsapp://send?phone=${val}&text=Hola, soy tu repartidor de DSicario. Voy en camino con tu pedido.`;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp no está instalado'));
    } else if (type === 'gps') {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el mapa'));
    } else if (type === 'call') {
      Linking.openURL(`tel:${val}`).catch(() => Alert.alert('Error', 'No se pudo realizar la llamada'));
    }
  };

  const handlePickup = async (orderId) => {
    Alert.alert(
      'Recoger Pedido',
      '¿Confirmas que ya tienes el pedido en tus manos?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, Salir', 
          onPress: async () => {
            setIsLoading(true);
            try {
              await pickupOrder(orderId, riderId);
              await loadData(true);
              setActiveTab('on_the_way');
            } catch (error) {
              Alert.alert('Error', 'Error al actualizar el estado.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeliver = (orderId) => {
    Alert.alert(
      'Finalizar Entrega',
      '¿El cliente recibió el pedido y se cobró el total?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Entregado ✅', 
          onPress: async () => {
            setIsLoading(true);
            try {
              await updateOrderStatus(orderId, 'delivered');
              await loadData(true);
              Alert.alert('¡Excelente trabajo!', 'Pedido entregado con éxito.');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la entrega.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderOrderItem = ({ item }) => (
    <GlassPanel intensity={20} style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <View style={styles.idBadge}>
            <Text style={styles.orderId}>#{String(item.id).slice(-4)}</Text>
        </View>
        <Text style={styles.orderTotal}>{formatPrice(item.Total || item.total)}</Text>
      </View>

      <Text style={[styles.customerName, { color: colors.text.primary }]}>{item.Cliente || item.cliente || 'Desconocido'}</Text>
      
      <View style={styles.addressBox}>
        <Ionicons name="location-sharp" size={14} color={colors.primary} />
        <Text style={styles.infoText} numberOfLines={2}>
            {item.Direccion || item.direccion || 'Dirección no especificada'}
        </Text>
      </View>

      <View style={styles.itemsBrief}>
         <View style={styles.itemsIcon}>
            <MaterialCommunityIcons name="food-fork-drink" size={14} color="#888" />
         </View>
         <Text style={styles.itemsText} numberOfLines={2}>
           {item.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
         </Text>
      </View>

      <View style={styles.actionsRow}>
        {item.estado === 'ready' ? (
           <TouchableOpacity 
             style={[styles.mainBtn, { backgroundColor: colors.primary }]}
             onPress={() => handlePickup(item.id)}
           >
             <FontAwesome5 name="motorcycle" size={16} color="#FFF" />
             <Text style={styles.mainBtnText}>TOMAR PEDIDO</Text>
           </TouchableOpacity>
        ) : (
           <TouchableOpacity 
             style={[styles.mainBtn, { backgroundColor: colors.success }]}
             onPress={() => handleDeliver(item.id)}
           >
             <FontAwesome5 name="check-double" size={16} color="#FFF" />
             <Text style={styles.mainBtnText}>ENTREGAR PEDIDO</Text>
           </TouchableOpacity>
        )}

        <View style={styles.secondaryActions}>
            <TouchableOpacity 
                style={[styles.circleBtn, { backgroundColor: '#25D366' }]}
                onPress={() => handleAction('whatsapp', item.whatsapp)}
            >
                <FontAwesome5 name="whatsapp" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.circleBtn, { backgroundColor: '#4285F4' }]}
                onPress={() => handleAction('gps', item.direccion)}
            >
                <Ionicons name="map" size={18} color="#FFF" />
            </TouchableOpacity>
        </View>
      </View>
    </GlassPanel>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      {/* 🚀 Header de Stats (Premium) */}
      <LinearGradient
        colors={[colors.primary, '#E63946']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsHeader}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.profileBadge}>
            <Text style={styles.profileInitial}>{stats.nombre?.charAt(0) || 'R'}</Text>
          </View>
          <Text style={styles.riderName}>{stats.nombre}</Text>
          <TouchableOpacity onPress={() => onRefresh()}>
            <Ionicons name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* INTERRUPTOR DE DISPONIBILIDAD */}
        <GlassPanel style={[styles.availabilityCard, { borderColor: stats.activo ? colors.success : colors.error }]}>
            <View style={styles.availabilityRow}>
                <View style={styles.availabilityInfo}>
                    <View style={[styles.statusDot, { backgroundColor: stats.activo ? colors.success : colors.error }]} />
                    <Text style={[styles.availabilityText, { color: stats.activo ? colors.success : colors.error }]}>
                        {stats.activo ? 'DISPONIBLE' : 'FUERA DE SERVICIO'}
                    </Text>
                </View>
                <Switch
                    value={stats.activo}
                    onValueChange={toggleAvailability}
                    trackColor={{ false: '#767577', true: colors.success + '80' }}
                    thumbColor={stats.activo ? colors.success : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                />
            </View>
        </GlassPanel>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>EN BOLSILLO</Text>
            <Text style={styles.statValue}>{formatPrice(stats.cartera)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>DEUDA</Text>
            <Text style={[styles.statValue, { color: '#FFD700' }]}>{formatPrice(stats.deuda)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>CUPO LIBRE</Text>
            <Text style={[styles.statValue, { color: '#90EE90' }]}>{formatPrice(stats.cupo)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* 📑 Pestañas de Navegación Operativa */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
            style={[styles.tab, activeTab === 'ready' && styles.activeTab]} 
            onPress={() => setActiveTab('ready')}
        >
          <MaterialCommunityIcons 
            name="package-variant" 
            size={20} 
            color={activeTab === 'ready' ? colors.primary : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === 'ready' && { color: colors.primary, fontWeight: 'bold' }]}>
            POR RECOGER
          </Text>
          {orders.filter(o => o.estado === 'ready').length > 0 && (
              <View style={styles.badgeCount}>
                  <Text style={styles.badgeText}>{orders.filter(o => o.estado === 'ready').length}</Text>
              </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.tab, activeTab === 'on_the_way' && styles.activeTab]} 
            onPress={() => setActiveTab('on_the_way')}
        >
          <MaterialCommunityIcons 
            name="truck-delivery" 
            size={20} 
            color={activeTab === 'on_the_way' ? colors.primary : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === 'on_the_way' && { color: colors.primary, fontWeight: 'bold' }]}>
            MIS ENVÍOS
          </Text>
        </TouchableOpacity>
      </View>

      {/* 📦 Lista de Pedidos */}
      <View style={styles.content}>
        {isLoading && !refreshing ? (
          <View style={styles.center}>
             <ActivityIndicator size="large" color={colors.primary} />
             <Text style={{marginTop: 10, color: '#888'}}>Sincronizando rutas...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderItem}
            keyExtractor={item => item?.id?.toString() || Math.random().toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name={activeTab === 'ready' ? "happy-outline" : "bicycle-outline"} size={80} color="#DDD" />
                <Text style={styles.emptyText}>
                    {activeTab === 'ready' 
                        ? '¡Genial! No hay pedidos esperando.' 
                        : 'No tienes entregas activas.'}
                </Text>
                {activeTab === 'ready' && (
                    <TouchableOpacity style={styles.refreshBtn} onPress={() => onRefresh()}>
                        <Text style={{color: colors.primary, fontWeight: 'bold'}}>Actualizar</Text>
                    </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>
      {/* MODAL DE PROPUESTA (DISEÃ‘O PREMIUM) */}
      <Modal visible={!!proposal} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 }}>
              <GlassPanel style={{ margin: 20, padding: 25, borderRadius: 25, alignItems: 'center' }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                      <FontAwesome5 name="motorcycle" size={40} color={colors.primary} />
                  </View>
                  
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>¡Nueva Oferta de Entrega!</Text>
                  <Text style={{ fontSize: 16, color: '#DDD', marginTop: 10, textAlign: 'center' }}>
                      Tienes un pedido directo esperando tu aceptaciÃ³n.
                  </Text>

                  <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 15, marginVertical: 25 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Text style={{ color: '#AAA' }}>Cliente:</Text>
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>{proposal?.Cliente || proposal?.cliente || 'Desconocido'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#AAA' }}>Total pedido:</Text>
                          <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}>RD${proposal?.Total || proposal?.total || '0.00'}</Text>
                      </View>
                  </View>

                  <View style={{ width: '100%', gap: 15 }}>
                      <TouchableOpacity 
                        style={{ backgroundColor: colors.success, padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => handleProposalResponse(true)}
                      >
                          <FontAwesome5 name="check-circle" size={20} color="white" style={{ marginRight: 10 }} />
                          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>ACEPTAR PEDIDO</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={{ backgroundColor: 'rgba(255,0,0,0.2)', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: colors.error }}
                        onPress={() => handleProposalResponse(false)}
                      >
                          <Text style={{ color: colors.error, fontWeight: 'bold', textAlign: 'center' }}>RECHAZAR</Text>
                      </TouchableOpacity>
                  </View>
              </GlassPanel>
          </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: { padding: 5 },
  profileBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  profileInitial: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  riderName: { flex: 1, color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  availabilityCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  availabilityText: {
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 20,
    paddingVertical: 15,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.2)' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  statValue: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: -20,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 15,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF6B35',
  },
  tabText: { fontSize: 10, color: '#888' },
  badgeCount: {
      backgroundColor: '#FF6B35',
      paddingHorizontal: 6,
      borderRadius: 10,
      marginLeft: 4
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  content: { flex: 1, padding: spacing.md },
  orderCard: {
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  idBadge: {
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderId: { fontSize: 12, color: '#E63946', fontWeight: 'bold' },
  orderTotal: { fontSize: 18, fontWeight: '900', color: '#1B4332' },
  customerName: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoText: { fontSize: 13, color: '#555', flex: 1 },
  itemsBrief: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: 8,
    borderRadius: 12,
    marginBottom: 15,
    gap: 8,
  },
  itemsIcon: { padding: 4 },
  itemsText: { fontSize: 12, color: '#777', flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
    elevation: 2,
  },
  mainBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  secondaryActions: { flexDirection: 'row', gap: 8 },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  listContainer: { paddingBottom: 100, paddingTop: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, color: '#AAA', fontSize: 15, textAlign: 'center' },
  refreshBtn: { marginTop: 20, padding: 10 }
});

export default RiderScreen;
