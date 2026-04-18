import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { useDataSync } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import { useAuth } from '../contexts/AuthContext';
import { updateOrderStatus } from '../utils/api';

const { width } = Dimensions.get('window');

const OrderCenterScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  const { kitchenOrders: orders, isSyncing, syncAllData, setKitchenOrders: setOrders } = useDataSync();
  const { role, contextUserId, contextUserEmail, isClientMode } = useUser();
  const { user: authUser } = useAuth();
  
  const isAdmin = role === 'Admin';
  const isCocina = role === 'Cocina';
  const isMesero = role === 'Mesero';
  
  // 🛡️ El staff solo tiene acceso total si NO está en "Modo Cliente"
  const isStaff = (isAdmin || isCocina || isMesero) && !isClientMode;

  const [activeTab, setActiveTab] = useState('pendientes'); // pendientes, preparando, ruta, entregado
  const [searchText, setSearchText] = useState('');

  const statusMap = {
    'pendientes': ['pending', 'nuevo'],
    'preparando': ['preparing', 'preparando'],
    'ruta': ['shipping', 'transito', 'ruta'],
    'entregado': ['delivered', 'finalizado', 'entregado']
  };

  const filteredOrders = useMemo(() => {
    let result = (orders || []);
    
    // 🛡️ FILTRO DE SEGURIDAD POR ROL
    if (!isStaff) {
      // Si no es personal, solo ve sus propios pedidos
      const myId = String(contextUserId || '').trim();
      const myEmail = String(contextUserEmail || authUser?.email || '').trim().toLowerCase();
      
      console.log('🛡️ Aplicando Filtro de Privacidad:', { myId, myEmail });

      result = result.filter(o => {
        // Usamos los nombres exactos que vienen de fetchKitchenOrders en api.js
        const orderUserId = String(o.id_user || o.id_usuario || '').trim();
        const orderEmail = String(o.email || '').trim().toLowerCase();
        
        const matchesId = myId !== '' && orderUserId !== '' && orderUserId === myId;
        const matchesEmail = myEmail !== '' && orderEmail !== '' && orderEmail === myEmail;
        
        return matchesId || matchesEmail;
      });
    }

    // Filter by tab status
    const allowedStatus = statusMap[activeTab];
    result = result.filter(o => allowedStatus.includes((o.Estado || o.status || '').toLowerCase()));
    
    // Search (Solo para staff)
    if (searchText && isStaff) {
      const search = searchText.toLowerCase();
      result = result.filter(o => 
        (o.id || o.ID_Orden || '').toLowerCase().includes(search) || 
        (o.NombreUser || o.id_user || '').toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [orders, activeTab, searchText, isStaff, contextUserId, contextUserEmail, authUser?.email]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => (o.id || o.ID_Orden) === orderId ? { ...o, Estado: newStatus } : o));
      Alert.alert('Éxito', `Pedido actualizado a ${newStatus}`);
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.md,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight + 20) : 45,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: { color: colors.text.white, fontSize: 18, fontWeight: 'bold' },
    backBtn: { padding: 5 },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      margin: spacing.md,
      borderRadius: 15,
      padding: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
    },
    tabItemActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: colors.text.secondary,
    },
    tabTextActive: {
      color: '#FFF',
    },
    searchContainer: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      height: 45,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    searchInput: {
      flex: 1,
      color: colors.text.primary,
      marginLeft: 8,
    },
    list: { padding: spacing.md, paddingBottom: 50 },
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
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
    },
    orderId: { fontWeight: 'bold', color: colors.primary },
    orderTime: { fontSize: 10, color: colors.text.secondary },
    customerName: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: 5 },
    orderTotal: { fontSize: 18, fontWeight: 'bold', color: colors.success },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 15,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    actionBtn: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primary + '15',
    },
    actionText: { color: colors.primary, fontWeight: 'bold', fontSize: 12 }
  }), [colors, darkMode]);

  const renderOrder = ({ item }) => {
    const id = item.id || item.ID_Orden;
    return (
      <GlassPanel intensity={10} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{id?.slice(-6).toUpperCase()}</Text>
          <Text style={styles.orderTime}>{item.Fecha || item.timestamp}</Text>
        </View>
        <Text style={styles.customerName}>{item.NombreUser || 'Cliente'}</Text>
        <Text style={styles.orderTotal}>${item.Total || item.total}</Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('OrderDetail', { order: item })}
          >
            <Text style={styles.actionText}>Ver Detalles</Text>
          </TouchableOpacity>
          
          {activeTab === 'pendientes' && isStaff && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
              onPress={() => handleUpdateStatus(id, 'preparing')}
            >
              <Text style={[styles.actionText, { color: colors.success }]}>Preparar</Text>
            </TouchableOpacity>
          )}

          {activeTab === 'preparando' && isStaff && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={() => handleUpdateStatus(id, 'shipping')}
            >
              <Text style={[styles.actionText, { color: colors.primary }]}>Enviar</Text>
            </TouchableOpacity>
          )}
        </View>
      </GlassPanel>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('InicioTab')} 
          style={styles.backBtn}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isStaff ? 'Central de Pedidos' : 'Mis Pedidos Activos'}
        </Text>
        <TouchableOpacity onPress={syncAllData}>
          <FontAwesome5 name="sync" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {Object.keys(statusMap).map(tab => (
          <TouchableOpacity 
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isStaff && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <FontAwesome5 name="search" size={14} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por ID o Cliente..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>
      )}

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item, index) => (item.id || item.ID_Orden || index).toString()}
        contentContainerStyle={styles.list}
        refreshing={isSyncing}
        onRefresh={syncAllData}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 100, opacity: 0.5 }}>
            <FontAwesome5 name="clipboard-list" size={50} color={colors.text.secondary} />
            <Text style={{ marginTop: 20, color: colors.text.secondary }}>No hay pedidos en esta sección</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default OrderCenterScreen;
