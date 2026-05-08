import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Animated
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { fetchKitchenOrders, updateOrderStatus, formatPrice } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const KitchenScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  const { 
    kitchenOrders: orders, 
    isSyncing, 
    syncAllData, 
    setKitchenOrders 
  } = useDataSync();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllData();
    setRefreshing(false);
  }, []);

  const handleUpdateStatus = async (orderId, currentStatus) => {
    const status = (currentStatus || '').toLowerCase();
    let nextStatus = '';
    
    if (status === 'pending' || status === 'pre-orden') {
      nextStatus = 'preparing';
    } else if (status === 'preparing') {
      nextStatus = 'ready';
    } else if (status === 'ready') {
      nextStatus = 'pending';
    }

    if (!nextStatus) return;

    try {
      setUpdatingOrderId(orderId);
      
      // 1. Update optimista inmediato en el contexto global
      setKitchenOrders(prevOrders => 
        prevOrders.map(o => {
          const targetId = orderId ? String(orderId).split('.')[0] : null;
          const currentOrderId = o.id ? String(o.id).split('.')[0] : null;
          
          if (targetId && currentOrderId && currentOrderId === targetId) {
            return { ...o, estado: nextStatus, Estado: nextStatus };
          }
          return o;
        })
      );

      // 2. Enviar al servidor
      await updateOrderStatus(orderId, nextStatus);
      
      // 3. Esperar un poco más para que Sheets se estabilice antes de pedir la lista nueva
      setTimeout(() => {
        syncAllData();
      }, 4000);

    } catch (error) {
      console.error("Error al actualizar cocina:", error);
      syncAllData(); // Revertir si falla
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pre-orden': return '#6A5ACD';
      case 'pending': return colors.warning;
      case 'preparing': return colors.primary;
      case 'ready': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    if (isSyncing || updatingOrderId) {
      setSyncStatus('active');
    } else {
      setSyncStatus('success');
    }
  }, [isSyncing, updatingOrderId]);

  const getSyncColor = () => {
    return syncStatus === 'active' ? colors.error : colors.info || colors.primary;
  };

  const activeOrders = orders.filter(o => 
    ['pending', 'preparing', 'pre-orden'].includes(o.estado?.toLowerCase())
  );
  
  const completedOrders = orders.filter(o => 
    ['ready', 'on_the_way', 'delivered'].includes(o.estado?.toLowerCase())
  ).reverse();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight + 20) : 45,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary },
    backButton: { padding: spacing.sm },
    refreshHeaderBtn: { padding: spacing.sm },
    listContainer: { padding: spacing.sm, paddingBottom: 40 },
    sectionHeader: { paddingHorizontal: spacing.sm, marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 4 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    gridItem: { width: '50%', padding: 2 },
    orderCard: {
      borderRadius: borders.radius.lg,
      overflow: 'hidden',
      minHeight: 220,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    statusStrip: { height: 6, width: '100%' },
    cardContent: { padding: spacing.md, flex: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
    orderId: { fontSize: 12, fontWeight: 'bold', color: colors.primary },
    customerName: { fontSize: 16, fontWeight: 'bold', marginTop: 2, color: colors.text.primary },
    timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    timeText: { fontSize: 10, marginLeft: 4, color: colors.text.secondary },
    productRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
    productQty: { fontWeight: 'bold', marginRight: 6, color: colors.primary },
    productName: { fontSize: 14, flex: 1, color: colors.text.primary },
    itemNotesText: { fontSize: 12, color: colors.text.secondary, fontStyle: 'italic', marginLeft: 22 },
    notesContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', padding: 6, borderRadius: 6, marginTop: 8, marginBottom: 8 },
    notesText: { fontSize: 11, marginLeft: 6, fontStyle: 'italic', color: colors.text.primary },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginTop: 10 },
    actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
    emptyText: { marginTop: 20, fontSize: 16, color: colors.text.disabled, textAlign: 'center', width: '100%' },
    syncIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    syncStatusText: { fontSize: 10, fontWeight: 'bold' },
    typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, gap: 4, marginTop: 4 },
    typeBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' }
  }), [colors, darkMode]);

  const renderOrderItem = ({ item }) => {
    const isPreOrder = item.estado?.toLowerCase() === 'pre-orden';
    const cardBg = isPreOrder ? '#1A0B2E' : colors.surface;
    const accentColor = isPreOrder ? '#B19CD9' : colors.primary;
    const textColor = isPreOrder ? '#FFF' : colors.text.primary;
    const subTextColor = isPreOrder ? '#A9A9A9' : colors.text.secondary;

    return (
      <View style={[styles.orderCard, isPreOrder && { backgroundColor: cardBg, borderColor: '#6A5ACD', borderWidth: 1.5 }]}>
        <View style={[styles.statusStrip, { backgroundColor: isPreOrder ? '#6A5ACD' : getStatusColor(item.estado) }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.orderId, { color: accentColor }]}>Orden #{item.id}</Text>
                {isPreOrder && <FontAwesome5 name="moon" size={12} color={accentColor} />}
              </View>
              
              {isPreOrder ? (
                <View style={[styles.typeBadge, { backgroundColor: '#6A5ACD' }]}>
                  <FontAwesome5 name="bolt" size={10} color="#FFF" />
                  <Text style={styles.typeBadgeText}>PRE-ORDEN PRIORITARIA</Text>
                </View>
              ) : item.tipo?.toLowerCase() === 'delivery' ? (
                <View style={[styles.typeBadge, { backgroundColor: '#FF6B35' }]}>
                  <FontAwesome5 name="motorcycle" size={10} color="#FFF" />
                  <Text style={styles.typeBadgeText}>DELIVERY</Text>
                </View>
              ) : item.mesa ? (
                <View style={[styles.typeBadge, { backgroundColor: '#2196F3' }]}>
                  <FontAwesome5 name="chair" size={10} color="#FFF" />
                  <Text style={styles.typeBadgeText}>MESA {item.mesa}</Text>
                </View>
              ) : (
                <View style={[styles.typeBadge, { backgroundColor: '#4CAF50' }]}>
                  <FontAwesome5 name="shopping-bag" size={10} color="#FFF" />
                  <Text style={styles.typeBadgeText}>LOCAL</Text>
                </View>
              )}
            </View>
            <View style={[styles.timeBadge, isPreOrder && { backgroundColor: 'rgba(177, 156, 217, 0.2)' }]}>
              <FontAwesome5 name="clock" size={12} color={isPreOrder ? accentColor : colors.text.secondary} />
              <Text style={[styles.timeText, isPreOrder && { color: accentColor }]}>{item.hora || 'Ahora'}</Text>
            </View>
          </View>
          <Text style={[styles.customerName, { color: textColor }]}>{item.cliente}</Text>
          <View style={{ flex: 1, marginTop: spacing.sm }}>
            {item.items && item.items.map((prod, idx) => (
              <View key={idx} style={{ marginBottom: 6 }}>
                <View style={styles.productRow}>
                  <Text style={[styles.productQty, { color: accentColor }]}>{prod.cantidad || prod.quantity}x</Text>
                  <Text style={[styles.productName, { color: isPreOrder ? '#E6E6FA' : colors.text.primary }]}>{prod.nombre || prod['ID_Producto.Nombre']}</Text>
                </View>
                {prod.notas ? (
                  <Text style={[styles.itemNotesText, { color: subTextColor }]}>💬 {prod.notas}</Text>
                ) : null}
              </View>
            ))}
          </View>
          {item.notas ? (
            <View style={[styles.notesContainer, isPreOrder && { backgroundColor: 'rgba(106, 90, 205, 0.2)' }]}>
              <FontAwesome5 name="sticky-note" size={12} color={accentColor} />
              <Text style={[styles.notesText, { color: isPreOrder ? accentColor : colors.text.primary }]}>{item.notas}</Text>
            </View>
          ) : null}
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isPreOrder ? '#6A5ACD' : getStatusColor(item.estado) }]}
            disabled={updatingOrderId === item.id}
            onPress={() => handleUpdateStatus(item.id, item.estado)}
          >
            {updatingOrderId === item.id ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <FontAwesome5 
                  name={isPreOrder ? 'fire' : (item.estado === 'preparing' ? 'check-circle' : item.estado === 'ready' ? 'undo' : 'fire')} 
                  size={16} color="#FFF" 
                />
                <Text style={styles.actionButtonText}>
                  {isPreOrder ? 'EMPEZAR COCINA' : (item.estado === 'preparing' ? 'MARCAR LISTO' : item.estado === 'ready' ? 'REINICIAR' : 'EMPEZAR COCINA')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.openDrawer()} 
          style={styles.backButton}
        >
          <Ionicons name="menu" size={26} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🍳 Monitor de Cocina</Text>
        <TouchableOpacity onPress={() => {
            Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', onPress: () => logout(), style: 'destructive' }
            ]);
          }} style={{ marginRight: 15 }}>
          <Ionicons name="log-out-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => syncAllData()} style={styles.refreshHeaderBtn}>
          <View style={styles.syncIndicator}>
            <FontAwesome5 name={syncStatus === 'active' ? "spinner" : "sync"} size={18} color={getSyncColor()} spin={syncStatus === 'active'} />
            <Text style={[styles.syncStatusText, { color: getSyncColor() }]}>{syncStatus === 'active' ? '...' : 'SYNC'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.listContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>🔥 COMANDAS ACTIVAS ({activeOrders.length})</Text>
        </View>
        <View style={styles.gridContainer}>
          {activeOrders.map(item => <View key={item.id} style={styles.gridItem}>{renderOrderItem({ item })}</View>)}
          {activeOrders.length === 0 && <Text style={styles.emptyText}>No hay pedidos activos.</Text>}
        </View>
        {completedOrders.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 40 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>📋 HISTORIAL ({completedOrders.length})</Text>
            </View>
            <View style={styles.gridContainer}>
              {completedOrders.map(item => <View key={item.id} style={styles.gridItem}>{renderOrderItem({ item })}</View>)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default KitchenScreen;
