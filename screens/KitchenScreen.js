import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
  
  const { kitchenOrders: orders, isSyncing, syncAllData } = useDataSync();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Auto-refresh cada 30 segundos usando la sincronización global
    const interval = setInterval(syncAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllData();
    setRefreshing(false);
  }, []);

  const handleUpdateStatus = async (orderId, currentStatus) => {
    const status = (currentStatus || '').toLowerCase();
    
    if (status === 'received' || status === 'pending' || status === 'nuevo') {
      nextStatus = 'preparing';
      confirmMsg = '¿Comenzar a preparar este pedido?';
    } else if (status === 'preparing' || status === 'preparando') {
      nextStatus = 'ready';
      confirmMsg = '¿Marcar como LISTO para entrega?';
    } else {
      console.warn('Estado no reconocido para actualización:', status);
      return;
    }

    Alert.alert(
      'Actualizar Estado',
      confirmMsg,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, Actualizar', 
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, nextStatus);
              syncAllData(); // Sincronizar globalmente tras el cambio
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el estado.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'received':
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

  const renderOrderItem = ({ item }) => (
    <GlassPanel intensity={20} style={styles.orderCard}>
      <View style={[styles.statusStrip, { backgroundColor: getStatusColor(item.estado) }]} />
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>Orden #{item.id}</Text>
            <Text style={styles.customerName}>{item.cliente}</Text>
          </View>
          <View style={styles.timeBadge}>
            <FontAwesome5 name="clock" size={12} color={colors.text.secondary} />
            <Text style={styles.timeText}>{item.hora || 'Ahora'}</Text>
          </View>
        </View>

        <View style={styles.itemsList}>
          {item.items && item.items.map((prod, index) => (
            <View key={index} style={styles.productRow}>
              <Text style={styles.productQty}>{prod.cantidad || prod.quantity}x</Text>
              <Text style={styles.productName}>{prod.nombre || prod['ID_Producto.Nombre']}</Text>
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
          style={[styles.actionButton, { backgroundColor: getStatusColor(item.estado) }]}
          onPress={() => handleUpdateStatus(item.id, item.estado)}
        >
          <FontAwesome5 
            name={item.estado === 'preparing' ? 'check-circle' : 'fire'} 
            size={16} 
            color="#FFF" 
          />
          <Text style={styles.actionButtonText}>
            {item.estado === 'preparing' ? 'MARCAR LISTO' : 'EMPEZAR COCINA'}
          </Text>
        </TouchableOpacity>
      </View>
    </GlassPanel>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>🍳 Monitor de Cocina</Text>
        <TouchableOpacity onPress={syncAllData} style={styles.refreshHeaderBtn}>
          <FontAwesome5 name="sync" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isSyncing && !refreshing && orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.text.secondary }}>Cargando comandas...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="utensils" size={50} color={colors.border} />
              <Text style={styles.emptyText}>No hay pedidos pendientes</Text>
            </View>
          }
        />
      )}
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
  },
  orderCard: {
    flex: 1,
    margin: spacing.xs,
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
  productRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  productQty: {
    fontWeight: 'bold',
    marginRight: 6,
    color: '#E63946',
  },
  productName: {
    fontSize: 14,
    flex: 1,
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
  }
});

export default KitchenScreen;
