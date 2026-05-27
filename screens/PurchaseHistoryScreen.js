import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useCart } from '../contexts/AppContext';
import { fetchOrders } from '../utils/api';

const PurchaseHistoryScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { user: authUser } = useAuth();
  const { userId, email: contextUserEmail, role } = useUser();
  const { activeStaffMode } = useCart();
  
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [userId, contextUserEmail]);

  const loadOrders = async () => {
    try {
      // Si no hay identidad, no intentamos cargar nada por seguridad
      if (!userId && !contextUserEmail) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      const allOrders = await fetchOrders();
      
      // Filtro por Rol: Admin ve todo, Usuario normal solo lo suyo
      const filtered = (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'administrador')
        ? allOrders 
        : allOrders.filter(o => {
        const orderUserId = String(o.id_user || o.ID_Usuario || '').trim();
        const orderEmail = String(o.EmailUser || o.email || '').trim().toLowerCase();
        
        const myId = String(userId || '').trim();
        const myEmail = String(contextUserEmail || authUser?.email || '').trim().toLowerCase();

        // 🛡️ FILTRO BLINDADO:
        // 1. El ID no puede estar vacío y debe coincidir.
        // 2. O el Email no puede estar vacío y debe coincidir.
        const matchesId = myId !== '' && orderUserId !== '' && orderUserId === myId;
        const matchesEmail = myEmail !== '' && orderEmail !== '' && orderEmail === myEmail;

        return matchesId || matchesEmail;
      }).sort((a, b) => {
        const dateA = new Date(a.Fecha || a.timestamp || 0);
        const dateB = new Date(b.Fecha || b.timestamp || 0);
        return dateB - dateA;
      });
      
      setOrders(filtered);
    } catch (error) {
      console.log('Error loading history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getStatusConfig = (status) => {
    const s = (status || '').toLowerCase();
    if (['pending', 'nuevo'].includes(s)) return { label: 'Recibido', color: colors.primary };
    if (['preparing', 'preparando'].includes(s)) return { label: 'Preparando', color: '#FF8C00' };
    if (['shipping', 'ruta', 'transito'].includes(s)) return { label: 'En camino', color: '#457B9D' };
    if (['delivered', 'finalizado', 'entregado'].includes(s)) return { label: 'Entregado', color: colors.success };
    return { label: 'Pendiente', color: colors.text.secondary };
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.md,
      paddingTop: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: { 
      color: colors.text.primary, 
      fontSize: 22, 
      fontWeight: 'bold',
      marginLeft: 15
    },
    backBtn: { 
      padding: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      ...shadows.small
    },
    list: { padding: spacing.md },
    orderCard: {
      padding: spacing.md,
      borderRadius: 20,
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    orderId: { fontWeight: 'bold', color: colors.text.primary },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 15,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    orderDate: { fontSize: 12, color: colors.text.secondary },
    orderTotal: { fontSize: 16, fontWeight: 'bold', color: colors.success },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 100,
      opacity: 0.5
    },
    emptyText: {
      marginTop: 20,
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center'
    }
  }), [colors, darkMode]);

  const renderOrder = ({ item }) => {
    const s = (item.Estado || item.status || '').toLowerCase();
    const status = getStatusConfig(s);
    return (
      <TouchableOpacity 
        onPress={() => navigation.navigate('DeliveryTracking', { orderId: item.ID_Pedido || item.id })}
      >
        <GlassPanel intensity={10} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderId}>Orden #{String(item.ID_Orden || item.ID_Pedido || item.id || '').toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
          </View>
          
          <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
            {item.Items || 'Pedido realizado'}
          </Text>

          <View style={styles.orderFooter}>
            <Text style={styles.orderDate}>{item.Fecha || item.timestamp}</Text>
            <Text style={styles.orderTotal}>${item.Total || item.total}</Text>
          </View>

          {/* 📍 BOTÓN DE RASTREO — Solo para pedidos no entregados */}
          {s !== 'delivered' && s !== 'finalizado' && s !== 'entregado' && (
            <TouchableOpacity 
              style={{ 
                marginTop: 15, 
                backgroundColor: colors.primary + '15', 
                padding: 10, 
                borderRadius: 12,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.primary + '30'
              }}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('DeliveryTracking', { orderId: item.id || item.ID_Orden });
              }}
            >
              <FontAwesome5 name="map-marked-alt" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 8, fontSize: 13 }}>Rastrear Pedido</Text>
            </TouchableOpacity>
          )}
        </GlassPanel>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="chevron-left" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeStaffMode === 'mesero' ? 'Mis Servicios 🤵' : 'Mis Compras'}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item, index) => (item.id || item.ID_Orden || index).toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={() => {
                setIsRefreshing(true);
                loadOrders();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name={activeStaffMode === 'mesero' ? "concierge-bell" : "shopping-bag"} size={60} color={colors.border} />
              <Text style={styles.emptyText}>
                {activeStaffMode === 'mesero' 
                  ? 'No tienes servicios registrados aún.' 
                  : 'Aún no has realizado ninguna compra.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default PurchaseHistoryScreen;
