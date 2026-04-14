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
  Alert,
  Linking
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { fetchRiderOrders, fetchRiderStats, updateOrderStatus, formatPrice } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';

const RiderScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  // Para pruebas usaremos un ID por defecto o el que venga por params
  const riderId = route.params?.riderId || 'DS001'; 
  
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ cartera: 0, deuda: 0, cupo: 0, nombre: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isAutoSyncEnabled } = useDataSync();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [orderData, statData] = await Promise.all([
        fetchRiderOrders(riderId),
        fetchRiderStats(riderId)
      ]);
      setOrders(orderData);
      setStats(statData);
    } catch (error) {
      console.error('Error loading rider data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Intervalo de refresco global (solo si está ON)
    let interval = null;
    if (isAutoSyncEnabled) {
      interval = setInterval(loadData, 30000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isAutoSyncEnabled]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleAction = (type, val) => {
    if (type === 'whatsapp') {
      const url = `whatsapp://send?phone=${val}&text=Hola, soy tu repartidor de DSicario. Voy en camino con tu pedido.`;
      Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp no está instalado'));
    } else if (type === 'gps') {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`;
      Linking.openURL(url);
    }
  };

  const handlePickup = async (orderId) => {
    try {
      await updateOrderStatus(orderId, 'on_the_way');
      Alert.alert('🛵 En Camino', 'Has recogido el pedido. ¡Mucho cuidado en la vía!');
      loadData();
    } catch (error) {
       Alert.alert('Error', 'No se pudo actualizar el estado.');
    }
  };

  const handleDeliver = (orderId) => {
    Alert.alert(
      'Confirmar Entrega',
      '¿Ya entregaste y cobraste este pedido? El cupo se liberará en tu cartera.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Entregado', 
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, 'delivered');
              Alert.alert('✅ Éxito', 'Pedido entregado. Tu cupo ha sido liberado.');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el estado.');
            }
          }
        }
      ]
    );
  };

  const renderOrderItem = ({ item }) => (
    <GlassPanel intensity={15} style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>#{item.id}</Text>
          <Text style={styles.customerName}>{item.cliente}</Text>
        </View>
        <Text style={styles.orderTotal}>{formatPrice(item.total)}</Text>
      </View>

      <View style={styles.itemsBrief}>
         <Text style={styles.itemsText} numberOfLines={1}>
           {item.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
         </Text>
      </View>

      <View style={styles.actionsRow}>
        {item.estado === 'ready' ? (
           <TouchableOpacity 
             style={[styles.miniBtn, { backgroundColor: colors.primary }]}
             onPress={() => handlePickup(item.id)}
           >
             <FontAwesome5 name="motorcycle" size={16} color="#FFF" />
             <Text style={styles.miniBtnText}>Recoger</Text>
           </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.miniBtn, { backgroundColor: colors.success }]}
            onPress={() => handleDeliver(item.id)}
          >
            <FontAwesome5 name="check" size={16} color="#FFF" />
            <Text style={styles.miniBtnText}>Liquidar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.miniBtn, { backgroundColor: '#25D366' }]}
          onPress={() => handleAction('whatsapp', item.whatsapp)}
        >
          <FontAwesome5 name="whatsapp" size={16} color="#FFF" />
          <Text style={styles.miniBtnText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </GlassPanel>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Stats Header */}
      <View style={[styles.statsHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.statsTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <FontAwesome5 name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.riderName}>{stats.nombre}</Text>
          <View width={20} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>CARTERA</Text>
            <Text style={styles.statValue}>{formatPrice(stats.cartera)}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.statLabel}>DEUDA ACTIVA</Text>
            <Text style={[styles.statValue, { color: '#FFD700' }]}>{formatPrice(stats.deuda)}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.statLabel}>CUPO LIBRE</Text>
            <Text style={[styles.statValue, { color: stats.cupo > 0 ? '#90EE90' : '#FF4444' }]}>
              {formatPrice(stats.cupo)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>📦 Pedidos para Entrega</Text>
        
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="box-open" size={60} color={colors.border} />
                <Text style={styles.emptyText}>No tienes pedidos asignados</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsHeader: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...shadows.medium,
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  riderName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  orderCard: {
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 12,
    color: '#E63946',
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E63946',
  },
  itemsBrief: {
    marginVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 6,
    borderRadius: 6,
  },
  itemsText: {
    fontSize: 12,
    color: '#666',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: 8,
  },
  miniBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  miniBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 20,
    color: '#999',
    fontSize: 16,
  }
});

export default RiderScreen;
