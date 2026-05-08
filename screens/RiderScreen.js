import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import QRCode from 'react-native-qrcode-svg';
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
  Switch,
  Platform
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { fetchRiderOrders, fetchRiderStats, updateOrderStatus, pickupOrder, formatPrice, respondToOffer, updateDelivery } from '../utils/api';
import { registerForPushNotifications, saveRiderPushToken, setupNotificationResponseListener } from '../utils/notifications';
import { useDataSync } from '../contexts/AppContext';
import GlassPanel from '../components/GlassPanel';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { CONFIG } from '../constants/Config';

const RiderScreen = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { username, userId: contextUserId } = useUser();
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const riderId = route.params?.riderId || contextUserId || 'DLV01'; 
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ 
    cartera: 0, 
    deuda: 0, 
    cupo: 0, 
    nombre: user?.displayName || user?.email?.split('@')[0] || 'Repartidor', 
    id_repartidor: riderId,
    activo: false 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ready'); 
  const { isAutoSyncEnabled } = useDataSync();
  const [proposal, setProposal] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [showQR, setShowQR] = useState(false);
  const [activeQRData, setActiveQRData] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]); // ✅ Estado para selección múltiple
  const timerRef = useRef(null);

  // Sincronización de propuesta y contador
  useEffect(() => {
    if (proposal && proposal.id) {
      // Intentamos extraer el timestamp del ID (ORD-123456789)
      const timestamp = parseInt(proposal.id.replace('ORD-', ''));
      if (!isNaN(timestamp)) {
        const elapsed = Math.floor((Date.now() - timestamp) / 1000);
        const actualTimeLeft = Math.max(0, 20 - elapsed);
        
        console.log(`[Timer] Pedido creado hace ${elapsed}s. Iniciando contador en: ${actualTimeLeft}s`);
        setTimeLeft(actualTimeLeft);

        if (actualTimeLeft <= 0) {
          handleProposalResponse(false);
          return;
        }
      } else {
        setTimeLeft(20);
      }

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleProposalResponse(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(20);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [proposal]);

  const [lastAssignedCount, setLastAssignedCount] = useState(0);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      console.log(`[RiderDebug] Buscando pedidos para ID: "${riderId}"`);
      const [orderData, statData] = await Promise.all([
        fetchRiderOrders(riderId),
        fetchRiderStats(riderId, user?.email)
      ]);
      console.log(`[RiderDebug] Pedidos encontrados: ${orderData.length}`, orderData.map(o => ({ id: o.id, estado: o.estado })));
      
      const currentProposal = orderData.find(o => String(o.estado).toLowerCase().trim() === 'propuesta');
      if (currentProposal && (!proposal || proposal.id !== currentProposal.id)) {
          console.log('[RiderDebug] 📢 ¡Propuesta detectada!', currentProposal.id);
          setProposal(currentProposal);
          // 🔔 Notificar al repartidor en su propio navegador
          if (Platform.OS === 'web') {
            import('../utils/notifications').then(m => {
              m.sendWebBrowserNotification({
                cliente: currentProposal.cliente || currentProposal.Cliente || 'Nuevo Pedido',
                total: currentProposal.total || currentProposal.Total || 0,
                orderId: currentProposal.id
              });
            });
          }
      } else if (!currentProposal && proposal) {
          setProposal(null);
      }
      const currentAssigned = orderData.filter(o => 
          (String(o.id_repartidor || '').toLowerCase() === String(riderId).toLowerCase()) && 
          ['ready', 'on_the_way'].includes(String(o.estado).toLowerCase())
      ).length;

      if (currentAssigned > lastAssignedCount) {
          console.log('[RiderDebug] 🚚 ¡Nuevo pedido asignado detectado!');
          const msg = "Un administrador te ha asignado un pedido.";
          if (Platform.OS === 'web') {
            import('../utils/notifications').then(m => m.sendWebBrowserNotification({ cliente: 'Admin', total: 'Asignado', orderId: 'NEW' }));
          }
          Alert.alert("🚀 ¡NUEVO PEDIDO!", msg);
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
        Alert.alert('Error', 'No se pudo enviar la respuesta.');
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    let interval = null;
    if (isAutoSyncEnabled) {
      interval = setInterval(() => loadData(true), 1000);
    }
    const setupPushNotifications = async () => {
      const token = await registerForPushNotifications();
      if (token) await saveRiderPushToken(riderId, token);
    };
    setupPushNotifications();
    const unsubscribeNotif = setupNotificationResponseListener(() => loadData(true));
    return () => {
      if (interval) clearInterval(interval);
      unsubscribeNotif();
    };
  }, [isAutoSyncEnabled, riderId]);

  // Cerrar Modal QR si el pedido se confirma (desde el lado del cliente)
  useEffect(() => {
    if (showQR && activeQRData) {
      try {
        const payload = JSON.parse(activeQRData);
        const currentOrder = orders.find(o => String(o.id) === String(payload.orderId));
        if (currentOrder && (String(currentOrder.estado).toLowerCase() === 'delivered' || String(currentOrder.estado).toLowerCase() === 'entregado')) {
          setShowQR(false);
          setActiveQRData(null);
          if (Platform.OS !== 'web') {
             Alert.alert('✅ ¡Entregado!', 'El cliente ha confirmado la recepción del pedido.');
          }
        }
      } catch (e) {
        console.error("Error parsing QR payload in effect:", e);
      }
    }
  }, [orders, showQR, activeQRData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, []);

  const toggleAvailability = async (value) => {
    try {
      // Usar los datos completos del rider para no perder info al actualizar
      const updatedRider = { 
        ...stats.fullData, 
        id_delivery: riderId, 
        id: riderId, 
        activo: value,
        disponible: value // Sincronizamos activo con disponible por ahora
      };
      setStats(prev => ({ ...prev, activo: value }));
      const res = await updateDelivery(updatedRider);
      if (!res || !(res.success || res.status === 'success')) {
        setStats(prev => ({ ...prev, activo: !value }));
        Alert.alert('Error', 'El servidor no pudo guardar el cambio.');
      }
    } catch (e) {
      setStats(prev => ({ ...prev, activo: !value }));
      Alert.alert('Error', 'No se pudo actualizar tu disponibilidad.');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const status = String(o.estado || '').toLowerCase().trim();
      if (activeTab === 'ready') {
        return ['pending', 'accepted', 'ready', 'listo'].includes(status);
      }
      if (activeTab === 'on_the_way') {
        return status === 'on_the_way' || status === 'transit' || status === 'en camino';
      }
      if (activeTab === 'route') {
        return ['on_the_way', 'transit', 'en camino', 'ready', 'listo'].includes(status);
      }
      return status === activeTab;
    });
  }, [orders, activeTab]);

  const handleAction = (type, val) => {
    if (type === 'whatsapp') {
      Linking.openURL(`whatsapp://send?phone=${val}&text=Hola, soy tu repartidor de DSicario.`).catch(() => Alert.alert('Error', 'WhatsApp no instalado'));
    } else if (type === 'gps') {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`).catch(() => Alert.alert('Error', 'No se pudo abrir el mapa'));
    } else if (type === 'call') {
      Linking.openURL(`tel:${val}`).catch(() => Alert.alert('Error', 'No se pudo llamar'));
    }
  };

  const handlePickup = async (order) => {
    const orderId = order.id;
    const orderTotal = parseFloat(order.total || order.Total || 0);
    const availableFunds = (parseFloat(stats.cartera) || 0) + (parseFloat(stats.cupo) || 0);

    if (orderTotal > availableFunds) {
      Alert.alert(
        'Saldo Insuficiente', 
        `Tu saldo (RD$ ${availableFunds}) no alcanza para este pedido (RD$ ${orderTotal}).\n\nPor favor, recarga tu Cartera.`
      );
      return;
    }

    const executePickup = async () => {
      setIsLoading(true);
      try {
        await pickupOrder(orderId, riderId);
        await loadData(true);
        setActiveTab('on_the_way');
      } catch (error) {
        Alert.alert('Error', 'Error al actualizar.');
      } finally {
        setIsLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Confirmas que ya tienes el pedido?')) {
        executePickup();
      }
    } else {
      Alert.alert('Recoger Pedido', '¿Confirmas que ya tienes el pedido?', [
        { text: 'No', style: 'cancel' },
        { text: 'Sí', onPress: executePickup }
      ]);
    }
  };

  // ✅ Nueva función para recoger múltiples pedidos
  const handleBulkPickup = async () => {
    if (selectedOrders.length === 0) return;

    // Calcular total de los pedidos seleccionados
    const selectedData = orders.filter(o => selectedOrders.includes(o.id));
    const totalBulk = selectedData.reduce((sum, o) => sum + (parseFloat(o.total || o.Total) || 0), 0);
    const availableFunds = (parseFloat(stats.cartera) || 0) + (parseFloat(stats.cupo) || 0);

    if (totalBulk > availableFunds) {
      Alert.alert(
        'Saldo Insuficiente', 
        `El total (RD$ ${totalBulk}) supera tu saldo disponible (RD$ ${availableFunds}).`
      );
      return;
    }

    const executeBulk = async () => {
      setIsLoading(true);
      try {
        // Ejecutamos todos los pickups en paralelo
        await Promise.all(selectedOrders.map(id => pickupOrder(id, riderId)));
        setSelectedOrders([]); // Limpiar selección
        await loadData(true);
        setActiveTab('on_the_way');
        Alert.alert('✅ Éxito', `${selectedOrders.length} pedidos recogidos correctamente.`);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron recoger algunos pedidos.');
      } finally {
        setIsLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Confirmas que recoges estos ${selectedOrders.length} pedidos?`)) {
        executeBulk();
      }
    } else {
      Alert.alert(
        'Recoger Múltiples', 
        `¿Confirmas que ya tienes los ${selectedOrders.length} pedidos seleccionados?`, 
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sí', onPress: executeBulk }
        ]
      );
    }
  };

  const toggleSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const handleDeliver = (order) => {
    // En lugar de confirmar nosotros, generamos el QR para que el cliente lo escanee
    const qrPayload = JSON.stringify({
      orderId: order.id,
      riderId: riderId,
      paymentMethod: order.Pago || order.MetodoPago || 'Efectivo',
      action: 'confirm_delivery',
      timestamp: Date.now()
    });
    
    setActiveQRData(qrPayload);
    setShowQR(true);
  };


  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    statsHeader: { 
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight + 2) : 10, 
      paddingBottom: 25, 
      paddingHorizontal: spacing.md, 
      borderBottomLeftRadius: 25, 
      borderBottomRightRadius: 25, 
      elevation: 8, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.3, 
      shadowRadius: 5 
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    backBtn: { padding: 5 },
    profileBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginHorizontal: 10 },
    profileInitial: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    riderName: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    availabilityCard: { marginHorizontal: spacing.md, marginVertical: 2, padding: 8, borderRadius: 15, borderWidth: 1 },
    availabilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    availabilityInfo: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: spacing.sm },
    availabilityText: { fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    statsGrid: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20, paddingVertical: 8, marginBottom: 15 },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.2)' },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
    statValue: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    tabContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: -15, zIndex: 10 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingVertical: 12, marginHorizontal: 4, borderRadius: 15, gap: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
    activeTab: { borderBottomWidth: 3, borderBottomColor: colors.primary },
    tabText: { fontSize: 10, color: colors.text.secondary },
    badgeCount: { backgroundColor: colors.primary, paddingHorizontal: 6, borderRadius: 10, marginLeft: 4 },
    badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
    content: { flex: 1, padding: spacing.md },
    orderCard: { borderRadius: 20, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    idBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    orderId: { fontSize: 12, color: colors.primary, fontWeight: 'bold' },
    orderTotal: { fontSize: 18, fontWeight: '900', color: colors.success },
    customerName: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: colors.text.primary },
    addressBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    infoText: { fontSize: 13, color: colors.text.secondary, flex: 1 },
    itemsBrief: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 8, borderRadius: 12, marginBottom: 15, gap: 8 },
    itemsText: { fontSize: 12, color: colors.text.secondary, flex: 1 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mainBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 10, elevation: 2 },
    mainBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
    secondaryActions: { flexDirection: 'row', gap: 8 },
    circleBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', elevation: 3 },
    listContainer: { paddingBottom: 100, paddingTop: 20 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { marginTop: 15, color: colors.text.disabled, fontSize: 15, textAlign: 'center' },
    refreshBtn: { marginTop: 20, padding: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
    proposalCard: { borderRadius: 30, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    proposalHeader: { paddingVertical: 20, alignItems: 'center', gap: 10 },
    proposalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
    proposalBody: { padding: 20 },
    proposalMainInfo: { alignItems: 'center', marginBottom: 15 },
    proposalPrice: { fontSize: 32, fontWeight: '900', color: colors.success },
    proposalOrderId: { fontSize: 14, color: colors.text.secondary, marginTop: -5 },
    proposalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    proposalDetailText: { fontSize: 14, color: colors.text.primary, flex: 1, fontWeight: '500' },
    proposalItemsBox: { backgroundColor: colors.background, padding: 12, borderRadius: 15, marginTop: 10 },
    itemsTitle: { fontSize: 11, fontWeight: 'bold', color: colors.text.secondary, marginBottom: 5 },
    itemsContent: { fontSize: 12, color: colors.text.primary, lineHeight: 18 },
    proposalActions: { flexDirection: 'row', padding: 15, gap: 10 },
    propBtn: { flex: 1, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    declineBtn: { backgroundColor: colors.error },
    acceptBtn: { backgroundColor: colors.success },
    propBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    floatingProposal: { 
      position: 'absolute', 
      top: 60, 
      left: 15, 
      right: 15, 
      zIndex: 9999, 
      elevation: 15, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 10 }, 
      shadowOpacity: 0.5, 
      shadowRadius: 15 
    },
    proposalInner: { padding: 15, borderRadius: 25, borderWidth: 2, borderColor: colors.primary },
    propHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    timerBadge: { 
      width: 45, 
      height: 45, 
      borderRadius: 22.5, 
      backgroundColor: colors.primary, 
      alignItems: 'center', 
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.3)'
    },
    timerText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
    propTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    propClient: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    propPrice: { color: colors.success, fontSize: 22, fontWeight: '900' },
    propActions: { flexDirection: 'row', gap: 10 },
    miniBtn: { height: 45, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
    qrCard: { padding: 30, borderRadius: 40, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
    qrHeader: { alignItems: 'center', marginBottom: 25 },
    qrTitle: { fontSize: 22, fontWeight: '900', color: colors.text.primary, marginTop: 10, letterSpacing: 1 },
    qrSubtitle: { fontSize: 13, color: colors.text.secondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    qrContainer: { padding: 20, backgroundColor: '#FFF', borderRadius: 25, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15 },
    qrFooter: { marginTop: 25, width: '100%' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 20, width: '100%' },
    // ✅ Badges de tipo
    typeBadge: { 
      paddingHorizontal: 8, 
      paddingVertical: 2, 
      borderRadius: 8, 
      borderWidth: 1, 
      borderColor: 'transparent' 
    },
    typeText: { 
      fontSize: 10, 
      fontWeight: 'bold' 
    },
    // ✅ Estilos para recogida múltiple
    footerAction: { 
      padding: spacing.md, 
      backgroundColor: colors.surface, 
      borderTopWidth: 1, 
      borderColor: colors.border,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.2,
      shadowRadius: 10
    },
    bulkPickupBtn: { 
      borderRadius: 20, 
      overflow: 'hidden',
      elevation: 5
    },
    bulkGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 18,
      gap: 12
    },
    bulkPickupText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 1
    }
  }), [colors, darkMode]);

  const renderOrderItem = ({ item }) => {
    const status = String(item.estado || '').toLowerCase();
    const isReady = status === 'ready' || status === 'listo';
    const isPending = status === 'pending';
    const isAccepted = status === 'accepted';
    const isDelivered = status === 'delivered';
    const isCancelled = status === 'cancelado' || status === 'rechazado';
    const isSelected = selectedOrders.includes(item.id);
    const isAssignedToMe = String(item.riderId || '').toLowerCase() === String(riderId).toLowerCase();

    return (
      <TouchableOpacity 
        activeOpacity={isReady ? 0.7 : 1}
        onPress={() => isReady ? toggleSelection(item.id) : null}
      >
        <GlassPanel intensity={20} style={[
          styles.orderCard, 
          isSelected && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary + '10' }
        ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* ✅ Checkbox para selección múltiple */}
            {isReady && (
              <View style={{ marginRight: 12 }}>
                <Ionicons 
                  name={isSelected ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={isSelected ? colors.primary : colors.text.disabled} 
                />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.idBadge}><Text style={styles.orderId}>#{String(item.id).slice(-4)}</Text></View>
                  <View style={[styles.typeBadge, { backgroundColor: (item.tipo || item.Tipo) ? colors.primary + '20' : colors.text.disabled + '20' }]}>
                    <Text style={[styles.typeText, { color: (item.tipo || item.Tipo) ? colors.primary : colors.text.disabled }]}>
                      {String(item.tipo || item.Tipo || 'DESCONOCIDO').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderTotal}>{formatPrice(item.Total || item.total)}</Text>
                  {item.envio > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <FontAwesome5 name="motorcycle" size={10} color={colors.success} />
                      <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>+{formatPrice(item.envio)}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.customerName}>{item.Cliente || item.cliente || 'Desconocido'}</Text>
              <View style={styles.addressBox}>
                <Ionicons name="location-sharp" size={14} color={colors.primary} />
                <Text style={styles.infoText} numberOfLines={2}>{item.Direccion || item.direccion || 'No especificada'}</Text>
              </View>
              <View style={styles.itemsBrief}>
                 <Text style={styles.itemsText} numberOfLines={2}>{item.items?.map(i => `${i.cantidad}x ${i.nombre}`).join(', ') || 'Sin items'}</Text>
              </View>

              {isReady && !isAssignedToMe && (
                <TouchableOpacity 
                  style={[styles.mainBtn, { backgroundColor: colors.primary, marginTop: 10 }]} 
                  onPress={() => handlePickup(item)}
                >
                  <FontAwesome5 name="hand-holding-heart" size={16} color="#FFF" />
                  <Text style={styles.mainBtnText}>RECOGER PEDIDO</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.actionsRow}>
            {isDelivered ? (
              <View style={[styles.mainBtn, { backgroundColor: colors.success + '20', borderWidth: 1, borderColor: colors.success }]}>
                <FontAwesome5 name="check-circle" size={16} color={colors.success} />
                <Text style={[styles.mainBtnText, { color: colors.success }]}>ENTREGADO</Text>
              </View>
            ) : isCancelled ? (
              <View style={[styles.mainBtn, { backgroundColor: colors.error + '20', borderWidth: 1, borderColor: colors.error }]}>
                <FontAwesome5 name="times-circle" size={16} color={colors.error} />
                <Text style={[styles.mainBtnText, { color: colors.error }]}>PEDIDO CANCELADO</Text>
              </View>
            ) : isAccepted ? (
              <View style={[styles.mainBtn, { backgroundColor: colors.text.disabled + '20', borderWidth: 1, borderColor: colors.border }]}>
                <FontAwesome5 name="user-clock" size={16} color={colors.text.disabled} />
                <Text style={[styles.mainBtnText, { color: colors.text.disabled }]}>ESPERANDO CLIENTE</Text>
              </View>
            ) : isPending ? (
              <View style={[styles.mainBtn, { backgroundColor: colors.text.disabled + '20', borderWidth: 1, borderColor: colors.border }]}>
                <FontAwesome5 name="fire" size={16} color={colors.text.disabled} />
                <Text style={[styles.mainBtnText, { color: colors.text.disabled }]}>EN COCINA</Text>
              </View>
            ) : isReady ? (
               <View style={[styles.mainBtn, { backgroundColor: colors.warning + '20', borderWidth: 1, borderColor: colors.warning }]}>
                 <FontAwesome5 name="box-open" size={16} color={colors.warning} />
                 <Text style={[styles.mainBtnText, { color: colors.warning }]}>LISTO PARA RECOGER</Text>
               </View>
            ) : (
              <TouchableOpacity 
                style={[styles.mainBtn, { backgroundColor: colors.success }]} 
                onPress={() => handleDeliver(item)}
              >
                <FontAwesome5 name="qrcode" size={16} color="#FFF" />
                <Text style={styles.mainBtnText}>GENERAR QR</Text>
              </TouchableOpacity>
            )}

            <View style={styles.secondaryActions}>
              <TouchableOpacity style={[styles.circleBtn, { backgroundColor: '#25D366' }]} onPress={() => handleAction('whatsapp', item.whatsapp)}>
                <FontAwesome5 name="whatsapp" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.circleBtn, { backgroundColor: '#4285F4' }]} onPress={() => handleAction('gps', item.direccion)}>
                <Ionicons name="map" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </GlassPanel>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[colors.primary, '#E63946']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.openDrawer()} 
            style={styles.backBtn}
          >
            <Ionicons name={navigation.canGoBack() ? "chevron-back" : "menu"} size={26} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.profileBadge}><Text style={styles.profileInitial}>{(stats.nombre !== 'Repartidor' ? stats.nombre : username)?.charAt(0) || 'R'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.riderName}>{stats.nombre !== 'Repartidor' ? stats.nombre : username}</Text>
          </View>
          <TouchableOpacity onPress={() => handleAction('whatsapp', '8294451001')} style={{ marginRight: 15 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', onPress: () => logout(), style: 'destructive' }
            ]);
          }} style={{ marginRight: 15 }}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>


              <TouchableOpacity onPress={() => loadData()} style={styles.syncBtn}>
                <FontAwesome5 name="sync-alt" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
        </View>
        <GlassPanel style={[styles.availabilityCard, { borderColor: stats.activo ? colors.success : colors.error }]}>
            <View style={styles.availabilityRow}>
                <View style={styles.availabilityInfo}>
                    <View style={[styles.statusDot, { backgroundColor: stats.activo ? colors.success : colors.error }]} />
                    <Text style={[styles.availabilityText, { color: stats.activo ? colors.success : colors.error }]}>{stats.activo ? 'DISPONIBLE' : 'SIN CONEXIÓN'}</Text>
                </View>
                <Switch value={stats.activo} onValueChange={toggleAvailability} trackColor={{ false: '#767577', true: colors.success + '80' }} thumbColor="#f4f3f4" />
            </View>
        </GlassPanel>


        <View style={styles.statsGrid}>
          <View style={styles.statItem}><Text style={styles.statLabel}>CARTERA</Text><Text style={styles.statValue}>{formatPrice(stats.cartera)}</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statLabel}>POR ENTREGAR</Text><Text style={[styles.statValue, { color: '#FFD700' }]}>{formatPrice(stats.deuda)}</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statLabel}>CREDITO DISP.</Text><Text style={[styles.statValue, { color: '#90EE90' }]}>{formatPrice(stats.cupo)}</Text></View>
        </View>
      </LinearGradient>
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'ready' && styles.activeTab]} onPress={() => setActiveTab('ready')}>
          <MaterialCommunityIcons name="package-variant" size={20} color={activeTab === 'ready' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'ready' && { color: colors.primary, fontWeight: 'bold' }]}>RECOGER</Text>
          {orders.filter(o => ['pending', 'accepted', 'ready', 'listo'].includes(o.estado)).length > 0 && <View style={styles.badgeCount}><Text style={styles.badgeText}>{orders.filter(o => ['pending', 'accepted', 'ready', 'listo'].includes(o.estado)).length}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'on_the_way' && styles.activeTab]} onPress={() => setActiveTab('on_the_way')}>
          <MaterialCommunityIcons name="truck-delivery" size={20} color={activeTab === 'on_the_way' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'on_the_way' && { color: colors.primary, fontWeight: 'bold' }]}>EN CAMINO</Text>
          {orders.filter(o => o.estado === 'on_the_way').length > 0 && <View style={styles.badgeCount}><Text style={styles.badgeText}>{orders.filter(o => o.estado === 'on_the_way').length}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'route' && styles.activeTab]} onPress={() => setActiveTab('route')}>
          <MaterialCommunityIcons name="map-marker-path" size={20} color={activeTab === 'route' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'route' && { color: colors.primary, fontWeight: 'bold' }]}>RUTA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'delivered' && styles.activeTab]} onPress={() => setActiveTab('delivered')}>
          <MaterialCommunityIcons name="history" size={20} color={activeTab === 'delivered' ? colors.primary : colors.text.secondary} />
          <Text style={[styles.tabText, activeTab === 'delivered' && { color: colors.primary, fontWeight: 'bold' }]}>HISTORIAL</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {isLoading && !refreshing ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : 
          activeTab === 'route' ? (
            <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', margin: 10 }}>
               {Platform.OS === 'web' ? (
                 <iframe
                   width="100%"
                   height="100%"
                   frameBorder="0"
                   style={{ border: 0 }}
                   src={`https://maps.google.com/maps?q=Santo+Domingo&hl=es&z=14&output=embed`}
                   allowFullScreen
                 ></iframe>
               ) : (
                 <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
                   <Ionicons name="map" size={50} color={colors.border} />
                   <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Mapa de Ruta (Nativo)</Text>
                 </View>
               )}
            </View>
          ) : (
            <FlatList data={filteredOrders} renderItem={renderOrderItem} keyExtractor={item => item?.id?.toString() || Math.random().toString()} contentContainerStyle={styles.listContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />} ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="bicycle-outline" size={80} color={colors.border} /><Text style={styles.emptyText}>Sin entregas activas.</Text></View>} />
          )
        }
      </View>
      {/* 📱 MODAL PARA CÓDIGO QR DE ENTREGA */}
      <Modal visible={showQR} transparent animationType="slide" onRequestClose={() => setShowQR(false)}>
        <View style={styles.modalOverlay}>
          <GlassPanel style={styles.qrCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowQR(false)}>
              <Ionicons name="close-circle" size={32} color={colors.text.secondary} />
            </TouchableOpacity>
            
            <View style={styles.qrHeader}>
              <FontAwesome5 name="qrcode" size={30} color={colors.primary} />
              <Text style={styles.qrTitle}>ENTREGA SEGURA</Text>
              <Text style={styles.qrSubtitle}>Pide al cliente que escanee este código para confirmar la entrega.</Text>
            </View>

            <View style={styles.qrContainer}>
              {activeQRData && (
                <QRCode
                  value={activeQRData}
                  size={220}
                  color={colors.text.primary}
                  backgroundColor="transparent"
                />
              )}
            </View>

            <View style={styles.qrFooter}>
              <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
                <ActivityIndicator size="small" color={colors.success} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.success, fontWeight: 'bold' }}>ESPERANDO ESCANEO...</Text>
              </View>
            </View>
          </GlassPanel>
        </View>
      </Modal>

      {/* 🚀 OVERLAY DE PROPUESTA FLOTANTE */}

      {proposal && (
        <View style={styles.floatingProposal}>
          <GlassPanel style={styles.proposalInner}>
            <View style={styles.propHeader}>
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>{timeLeft}s</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.propTitle}>¡Nueva Propuesta!</Text>
                <Text style={styles.propClient}>{proposal.cliente || 'Nuevo Cliente'}</Text>
              </View>
              <Text style={styles.propPrice}>RD${proposal.total || '0'}</Text>
            </View>

            <View style={styles.propActions}>
              <TouchableOpacity 
                style={[styles.miniBtn, { backgroundColor: colors.error + '20' }]} 
                onPress={() => handleProposalResponse(false)}
              >
                <Text style={{ color: colors.error, fontWeight: 'bold' }}>RECHAZAR</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.miniBtn, { backgroundColor: colors.success, flex: 2 }]} 
                onPress={() => handleProposalResponse(true)}
              >
                <FontAwesome5 name="check" size={14} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 8 }}>ACEPTAR PEDIDO</Text>
              </TouchableOpacity>
            </View>
          </GlassPanel>
        </View>
      )}
      {/* ✅ Botón Global de Recogida (Siempre visible) */}
      {activeTab === 'ready' && (
        <View style={styles.footerAction}>
          <TouchableOpacity 
            style={[
              styles.bulkPickupBtn, 
              { opacity: selectedOrders.length > 0 ? 1 : 0.5 }
            ]} 
            onPress={handleBulkPickup}
            disabled={selectedOrders.length === 0}
          >
            <LinearGradient 
              colors={selectedOrders.length > 0 ? [colors.success, '#2D6A4F'] : [colors.text.disabled, '#666']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }} 
              style={styles.bulkGradient}
            >
              <FontAwesome5 name="motorcycle" size={20} color="#FFF" />
              <Text style={styles.bulkPickupText}>
                {selectedOrders.length > 0 
                  ? `RECOGER SELECCIONADOS (${selectedOrders.length})` 
                  : 'SELECCIONA PEDIDOS PARA RECOGER'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default RiderScreen;
