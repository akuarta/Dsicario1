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
import { updateOrderStatus, deleteOrder } from '../utils/api';
import { generatePDFBase64 } from '../utils/pdfGenerator';

const { width } = Dimensions.get('window');

const OrderCenterScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  const { kitchenOrders: orders, isSyncing, syncAllData, setKitchenOrders: setOrders } = useDataSync();
  const { role, contextUserId, contextUserEmail, isClientMode } = useUser();
  const { user: authUser } = useAuth();
  
  const isAdmin = role === 'Admin' || role === 'Owner';
  const isCocina = role === 'Cocina';
  const isMesero = role === 'Mesero';
  
  // 🛡️ El staff solo tiene acceso total si NO está en "Modo Cliente"
  const isStaff = (isAdmin || isCocina || isMesero) && !isClientMode;

  const [activeTab, setActiveTab] = useState('pendientes'); // pendientes, preparando, ruta, entregado
  const [searchText, setSearchText] = useState('');
  const [loadingReceiptId, setLoadingReceiptId] = useState(null); // ID de la orden generando recibo
  const [updatingOrderId, setUpdatingOrderId] = useState(null); // ID de la orden actualizándose


  const handleGenerateReceipt = async (item) => {
    const id = item.id || item.ID_Orden;
    setLoadingReceiptId(id);
    try {
      const orderData = {
        idorden: String(id || '').slice(-8).toUpperCase(),
        fecha: item.Fecha ? item.Fecha.split('T')[0] : new Date().toLocaleDateString(),
        hora: item.Fecha ? new Date(item.Fecha).toLocaleTimeString() : new Date().toLocaleTimeString(),
        Cliente: item.NombreUser || item.cliente || 'Invitado',
        metodo: item.TipoPago || item.metodo || 'N/A',
        items: item.items || item.productos || [],
        Subtotal: item.Subtotal || item.subtotal || item.Total || item.total || '0.00',
        ITBIS: item.ITBIS || item.impuesto || '0.00',
        Descuento: item.Descuento || item.descuento || '0.00',
        Propina: item.Propina || item.propina || '0.00',
        Total: item.Total || item.total || '0.00',
        Pagado: item.Pagado || item.pagado || item.Total || '0.00',
        Devuelta: item.Devuelta || item.cambio || '0.00',
      };
      await generatePDFBase64(orderData);
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el recibo. Inténtalo de nuevo.');
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const statusMap = {
    'pendientes': ['pending', 'nuevo'],
    'preparando': ['preparing', 'preparando'],
    'listo': ['ready', 'listo'],
    'ruta': ['shipping', 'transito', 'ruta', 'on_the_way'],
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
    } else {
      // 2. Filtro por Rol (Seguridad)
      if (!isAdmin) {
        // Si es cocina, solo ve los que están en cocina (pendientes, preparando, listo)
        if (isCocina) {
          const kitchenStatus = ['pending', 'preparing', 'ready', 'listo'];
          result = result.filter(o => kitchenStatus.includes((o.Estado || o.status || '').toLowerCase()));
        }
        // Si es mesero, solo ve pedidos del local o sus propios pedidos
        else if (isMesero) {
          result = result.filter(o => 
            (String(o.tipo || '').toLowerCase() === 'local') || 
            (String(o.id_user || o.ID_Usuario || '').trim() === String(contextUserId).trim())
          );
        }
      }
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

  const confirmAction = (msg, onConfirm) => {
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        onConfirm();
      }
    } else {
      Alert.alert('Confirmar', msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', onPress: onConfirm }
      ]);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      // Actualización local inmediata para respuesta instantánea
      setOrders(prev => prev.map(o => (o.id || o.ID_Orden) === orderId ? { ...o, Estado: newStatus } : o));
      // No alert if it was fast, just move it
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = (orderId) => {
    Alert.alert(
      '⚠️ Eliminar Pedido',
      `¿Estás seguro de que deseas eliminar permanentemente el pedido #${orderId?.slice(-6)?.toUpperCase()}? Esto no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrder(orderId);
              setOrders(prev => prev.filter(o => (o.id || o.ID_Orden) !== orderId));
              Alert.alert('Éxito', 'Pedido eliminado correctamente.');
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el pedido. Verifica tu conexión.');
            }
          }
        }
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.sm,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight + 10) : 35,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: { color: colors.text.white, fontSize: 18, fontWeight: 'bold' },
    backBtn: { padding: 5 },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      marginHorizontal: spacing.md,
      marginVertical: spacing.xs,
      borderRadius: 15,
      padding: 4,
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
      padding: spacing.sm,
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
    actionText: { color: colors.primary, fontWeight: 'bold', fontSize: 12 },
    itemsBrief: {
      backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      padding: 10,
      borderRadius: 12,
      marginVertical: 8,
    },
    itemBriefText: {
      fontSize: 12,
      color: colors.text.secondary,
      lineHeight: 18,
    }
  }), [colors, darkMode]);

  const renderOrder = ({ item }) => {
    const id = item.id || item.ID_Orden;
    return (
      <GlassPanel intensity={10} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{id?.slice(-6).toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.orderTime}>{item.Fecha || item.timestamp}</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => handleDeleteOrder(id)} style={{ padding: 4, marginLeft: 5 }}>
                <FontAwesome5 name="trash-alt" size={14} color="#E31837" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.customerName}>{item.NombreUser || 'Cliente'}</Text>
        
        {/* 📦 RESUMEN DE PRODUCTOS */}
        <View style={styles.itemsBrief}>
          {(item.items || []).map((it, idx) => (
            <Text key={idx} style={styles.itemBriefText}>
              • {it.cantidad || 1}x {it.nombre || it.product}
            </Text>
          ))}
          {(!item.items || item.items.length === 0) && (
             <Text style={[styles.itemBriefText, { fontStyle: 'italic', opacity: 0.5 }]}>Sin detalles de productos</Text>
          )}
        </View>

        <Text style={styles.orderTotal}>${item.Total || item.total}</Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('DeliveryTracking', { orderId: id })}
          >
            <Text style={styles.actionText}>Detalles</Text>
          </TouchableOpacity>

          {/* 📍 RASTREO */}
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primary + '10' }]}
            onPress={() => navigation.navigate('DeliveryTracking', { orderId: id })}
          >
            <FontAwesome5 name="map-marker-alt" size={11} color={colors.primary} />
          </TouchableOpacity>

          {/* 🧾 BOTÓN DE RECIBO — Solo para staff */}
          {isStaff && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.warning + '20', flexDirection: 'row', alignItems: 'center', gap: 5 }]}
              onPress={() => handleGenerateReceipt(item)}
              disabled={loadingReceiptId === id}
            >
              {loadingReceiptId === id
                ? <ActivityIndicator size="small" color={colors.warning} />
                : <FontAwesome5 name="file-invoice" size={11} color={colors.warning} />
              }
              <Text style={[styles.actionText, { color: colors.warning }]}>Recibo</Text>
            </TouchableOpacity>
          )}
          
          {activeTab === 'pendientes' && isStaff && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
              onPress={() => handleUpdateStatus(id, 'preparing')}
              disabled={updatingOrderId === id}
            >
              {updatingOrderId === id ? <ActivityIndicator size="small" color={colors.success} /> : <Text style={[styles.actionText, { color: colors.success }]}>Preparar</Text>}
            </TouchableOpacity>
          )}

          {activeTab === 'preparando' && isStaff && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
              onPress={() => handleUpdateStatus(id, 'ready')}
              disabled={updatingOrderId === id}
            >
              {updatingOrderId === id ? <ActivityIndicator size="small" color={colors.success} /> : <Text style={[styles.actionText, { color: colors.success }]}>Marcar Listo</Text>}
            </TouchableOpacity>
          )}

          {activeTab === 'listo' && isStaff && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(String(item.Tipo || item.tipo || '').toLowerCase() === 'domicilio' || String(item.Tipo || item.tipo || '').toLowerCase() === 'delivery') ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => {
                    confirmAction(
                      '¿Deseas enviar este pedido? Asegúrate de que sea el cliente correcto.',
                      () => handleUpdateStatus(id, 'on_the_way')
                    );
                  }}
                  disabled={updatingOrderId === id}
                >
                  {updatingOrderId === id ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.actionText, { color: colors.primary }]}>Enviar Pedido</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
                  onPress={() => {
                    confirmAction(
                      '¿Deseas entregar este pedido? Asegúrate de que sea el cliente correcto.',
                      () => handleUpdateStatus(id, 'delivered')
                    );
                  }}
                  disabled={updatingOrderId === id}
                >
                  {updatingOrderId === id ? <ActivityIndicator size="small" color={colors.success} /> : <Text style={[styles.actionText, { color: colors.success }]}>Entregar al Cliente</Text>}
                </TouchableOpacity>
              )}
            </View>
          )}

          {activeTab === 'ruta' && isStaff && (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.success + '15' }]}
              onPress={() => {
                confirmAction(
                  '¿El pedido ya fue entregado? Asegúrate de que sea el cliente correcto.',
                  () => handleUpdateStatus(id, 'delivered')
                );
              }}
              disabled={updatingOrderId === id}
            >
              {updatingOrderId === id ? <ActivityIndicator size="small" color={colors.success} /> : <Text style={[styles.actionText, { color: colors.success }]}>Finalizar Entrega</Text>}
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
