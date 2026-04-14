import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalStyles } from '../styles/globalStyles';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const PurchaseHistoryScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const globalStyles = useGlobalStyles(colors);
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simular carga de historial (reemplazar con API real)
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      // TODO: Reemplazar con fetch a Google Sheets
      // Por ahora datos de demostración
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrders([
        {
          id: 'DS123456',
          fecha: '2024-01-15',
          hora: '14:30',
          estado: 'delivered',
          items: 3,
          total: 1250.00,
        },
        {
          id: 'DS123789',
          fecha: '2024-01-10',
          hora: '20:15',
          estado: 'delivered',
          items: 2,
          total: 850.00,
        },
      ]);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'preparing': return 'Preparando';
      case 'on_the_way': return 'En camino';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return colors.warning;
      case 'on_the_way': return colors.primary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.text.secondary;
    }
  };

  const renderOrderItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => {}}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Orden #{item.id}</Text>
          <Text style={styles.orderDate}>{item.fecha} • {item.hora}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.estado) }]}>
            {getStatusLabel(item.estado)}
          </Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <Text style={styles.orderItems}>{item.items} productos</Text>
        <Text style={styles.orderTotal}>RD${item.total.toFixed(2)}</Text>
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('DeliveryTracking', { orderId: item.id })}
        >
          <FontAwesome5 name="map-marker-alt" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Rastrear</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {}}
        >
          <FontAwesome5 name="receipt" size={14} color={colors.text.secondary} />
          <Text style={[styles.actionText, { color: colors.text.secondary }]}>Ticket</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [colors, navigation]);

  const renderEmptyOrders = useCallback(() => (
    <View style={globalStyles.emptyContainer}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: spacing.md, left: spacing.md, padding: spacing.sm, zIndex: 10 }}>
        <FontAwesome5 name="arrow-left" size={20} color={colors.text.primary} />
      </TouchableOpacity>
      <FontAwesome5 name="receipt" size={64} color={colors.text.light} />
      <Text style={globalStyles.emptyTitle}>Sin pedidos aún</Text>
      <Text style={globalStyles.emptyText}>
        ¡Tu historial de compras aparecerá aquí después de tu primer pedido!
      </Text>
      <TouchableOpacity 
        style={globalStyles.primaryButton}
        onPress={() => navigation.navigate('Explorar')}
      >
        <Text style={globalStyles.primaryButtonText}>Hacer un pedido</Text>
      </TouchableOpacity>
    </View>
  ), [navigation]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: spacing.md,
      backgroundColor: colors.primary,
    },
    headerTitle: {
      ...typography.h5,
      color: colors.text.white,
    },
    listContainer: {
      padding: spacing.md,
    },
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: borders.radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadows.medium,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    orderId: {
      ...typography.bodyMedium,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    orderDate: {
      ...typography.bodySmall,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borders.radius.sm,
    },
    statusText: {
      fontSize: typography.sizes.xs,
      fontWeight: 'bold',
    },
    orderDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginBottom: spacing.sm,
    },
    orderItems: {
      ...typography.bodySmall,
      color: colors.text.secondary,
    },
    orderTotal: {
      ...typography.h6,
      color: colors.primary,
    },
    orderActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
    },
    actionText: {
      marginLeft: spacing.xs,
      color: colors.primary,
      fontWeight: '600',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, globalStyles.centerContainer]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: spacing.md, left: spacing.md, padding: spacing.sm, zIndex: 10 }}>
          <FontAwesome5 name="arrow-left" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.text.secondary }}>
          Cargando historial...
        </Text>
      </SafeAreaView>
    );
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderEmptyOrders()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15, paddingVertical: 5 }}>
          <FontAwesome5 name="arrow-left" size={20} color={colors.text.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Compras</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default PurchaseHistoryScreen;
