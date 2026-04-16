import React, { useState, useEffect, useCallback } from 'react';
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
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { fetchKitchenOrders, updateOrderStatus, formatPrice } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';

const KitchenScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  const { 
    kitchenOrders: orders, 
    isSyncing, 
    syncAllData, 
    isAutoSyncEnabled, 
    setIsAutoSyncEnabled,
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
    console.log('🔘 BOTÓN PRESIONADO - ID:', orderId, 'Estado actual:', currentStatus);
    const status = (currentStatus || '').toLowerCase();
    let nextStatus = '';
    
    if (status === 'pending') {
      nextStatus = 'preparing';
    } else if (status === 'preparing') {
      nextStatus = 'ready';
    } else if (status === 'ready') {
      nextStatus = 'pending';
    } else {
      console.warn('Estado no reconocido para actualización:', status);
      return;
    }

    if (!nextStatus) {
      console.warn('Estado no reconocido para actualización:', status);
      return;
    }

    try {
      setUpdatingOrderId(orderId);
      console.log('--- 🍳 ACCIÓN: EMPEZAR COCINA ---');
      console.log('Actualizando Pedido ID:', orderId);
      console.log('Nuevo Estado Solicitado:', nextStatus);
      
      // 🚀 CAMBIO OPTIMISTA: Actualizar localmente de inmediato
      setKitchenOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? { ...o, estado: nextStatus } : o)
      );
      
      const result = await updateOrderStatus(orderId, nextStatus);
      
      console.log('✅ RESPUESTA DEL SERVIDOR:', result);
      console.log('---------------------------------');
      
      // Sincronizar suavemente para confirmar con el servidor
      setTimeout(() => syncAllData(), 1000);
    } catch (error) {
      console.error('❌ ERROR AL ACTUALIZAR COCINA:', error);
      // Revertir en caso de error si fuera necesario, o simplemente sincronizar
      syncAllData();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return colors.warning || '#FFC107';
      case 'preparing':
        return colors.primary || '#E63946';
      case 'ready':
        return colors.success || '#4CAF50';
      default:
        return colors.text.secondary;
    }
  };

  // 🚥 LÓGICA DEL SEMÁFORO DE SINCRONIZACIÓN
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'active', 'success'

  useEffect(() => {
    if (!isAutoSyncEnabled) {
      setSyncStatus('idle');
      return;
    }

    if (isSyncing || updatingOrderId) {
      setSyncStatus('active');
    } else {
      // Si está ON y no hay actividad, lo dejamos en success (Blue)
      setSyncStatus('success');
    }
  }, [isSyncing, updatingOrderId, isAutoSyncEnabled]);

  const getSyncColor = () => {
    if (!isAutoSyncEnabled) return '#9E9E9E'; // Gris (Desactivado)
    
    switch(syncStatus) {
      case 'active': return '#E63946'; // Rojo (Activo)
      default: return '#2196F3'; // Azul (Sincronizado)
    }
  };

  // 📂 FILTRADO DE SECCIONES
  const activeOrders = orders.filter(o => 
    ['pending', 'preparing'].includes(o.estado?.toLowerCase())
  );
  
  const completedOrders = orders.filter(o => 
    ['ready', 'on_the_way', 'delivered'].includes(o.estado?.toLowerCase())
  ).reverse(); // Mostrar los más recientes primero

  const renderOrderItem = ({ item }) => (
    <View style={[styles.orderCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
      <View style={[styles.statusStrip, { backgroundColor: getStatusColor(item.estado) }]} />
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>Orden #{item.id}</Text>
            <View style={styles.typeBadgeContainer}>
              {item.tipo?.toLowerCase() === 'delivery' ? (
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
          </View>
          <View style={styles.timeBadge}>
            <FontAwesome5 name="clock" size={12} color={colors.text.secondary} />
            <Text style={styles.timeText}>{item.hora || 'Ahora'}</Text>
          </View>
        </View>
        <Text style={styles.customerName}>{item.cliente}</Text>

        <View style={styles.itemsList}>
          {item.items && item.items.map((prod, index) => (
            <View key={index} style={styles.productRowContainer}>
              <View style={styles.productRow}>
                <Text style={styles.productQty}>{prod.cantidad || prod.quantity}x</Text>
                <Text style={styles.productName}>{prod.nombre || prod['ID_Producto.Nombre']}</Text>
              </View>
              {prod.notas ? (
                <View style={styles.itemNotesContainer}>
                  <FontAwesome5 name="comment-dots" size={10} color={colors.text.secondary} />
                  <Text style={styles.itemNotesText}>Obs: {prod.notas}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {item.notas ? (
          <View style={styles.notesContainer}>
            <FontAwesome5 name="sticky-note" size={12} color={colors.primary} />
            <Text style={styles.notesText}>{item.notas}</Text>
          </View>
        ) : null}

        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: getStatusColor(item.estado), zIndex: 999, elevation: 5 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={updatingOrderId === item.id}
          onPress={() => {
            console.log('>>> CLICK DETECTADO EN COMPONENTE <<<');
            handleUpdateStatus(item.id, item.estado);
          }}
        >
          {updatingOrderId === item.id ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <FontAwesome5 
                name={
                  item.estado === 'preparing' ? 'check-circle' : 
                  item.estado === 'ready' ? 'undo' : 'fire'
                } 
                size={16} 
                color="#FFF" 
              />
              <Text style={styles.actionButtonText}>
                {
                  item.estado === 'preparing' ? 'MARCAR LISTO' : 
                  item.estado === 'ready' ? 'REINICIAR' : 'EMPEZAR COCINA'
                }
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>🍳 Monitor de Cocina</Text>
        <TouchableOpacity 
          onPress={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)} 
          style={styles.refreshHeaderBtn}
        >
          <View style={styles.syncIndicator}>
            <FontAwesome5 
              name={syncStatus === 'active' ? "spinner" : (isAutoSyncEnabled ? "sync" : "sync-alt")} 
              size={18} 
              color={getSyncColor()} 
            />
            {isAutoSyncEnabled && (
                <Text style={[styles.syncStatusText, { color: getSyncColor() }]}>
                    {syncStatus === 'active' ? 'Activo...' : 'Sincronizado'}
                </Text>
            )}
            {!isAutoSyncEnabled && (
                <Text style={[styles.syncStatusText, { color: '#9E9E9E' }]}>OFF</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* 🔥 SECCIÓN: COMANDAS ACTIVAS */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>🔥 COMANDAS ACTIVAS ({activeOrders.length})</Text>
        </View>
        
        <View style={styles.gridContainer}>
          {activeOrders.map(item => (
            <View key={item.id} style={styles.gridItem}>
               {renderOrderItem({ item })}
            </View>
          ))}
          {activeOrders.length === 0 && (
            <Text style={styles.emptyText}>No hay nada por cocinar ahora mismo.</Text>
          )}
        </View>

        {/* 📋 SECCIÓN: HISTORIAL DE HOY */}
        {completedOrders.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 40 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>📋 HISTORIAL DE HOY ({completedOrders.length})</Text>
            </View>
            <View style={styles.gridContainer}>
              {completedOrders.map(item => (
                <View key={item.id} style={styles.gridItem}>
                   {renderOrderItem({ item })}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  backButton: {
    padding: spacing.sm,
  },
  refreshHeaderBtn: {
    padding: spacing.sm,
  },
  listContainer: {
    padding: spacing.sm,
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridItem: {
    width: '50%',
    padding: 2,
  },
  orderCard: {
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
    minHeight: 220,
    ...shadows.small,
  },
  statusStrip: {
    height: 6,
    width: '100%',
  },
  cardContent: {
    padding: spacing.md,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E63946',
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 10,
    marginLeft: 4,
    color: '#666',
  },
  itemsList: {
    flex: 1,
  },
  productRowContainer: {
    marginBottom: 6,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  productQty: {
    fontWeight: 'bold',
    marginRight: 6,
    color: '#E63946',
    marginTop: 2,
  },
  productName: {
    fontSize: 14,
    flex: 1,
    marginTop: 2,
  },
  itemNotesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 22,
    marginTop: 2,
  },
  itemNotesText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 11,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  typeBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  }
});

export default KitchenScreen;
