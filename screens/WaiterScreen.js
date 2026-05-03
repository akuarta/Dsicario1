import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Vibration,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { useDataSync } from '../contexts/AppContext';
import { updateOrderStatus, updateTableStatus, createDraftOrder, hardResetTable, deleteOrder, fetchTables, generateOrderId } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { showAlert } from '../utils/showAlert';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const WaiterScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { kitchenOrders, setKitchenOrders, tables, isSyncing, syncAllData, waiterActiveSession, setWaiterActiveSession, clearCart } = useDataSync();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Refrescar datos automáticamente al entrar a la pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📍 WaiterScreen enfocada. Mesas en sistema:', tables?.length || 0);
      if (tables && tables.length > 0) {
        console.log('📋 Lista de IDs de mesas:', tables.map(t => t.id).join(', '));
      }
      syncAllData();
    });
    return unsubscribe;
  }, [navigation, syncAllData, tables]);

  const [isClientModalVisible, setIsClientModalVisible] = useState(false);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [isOpening, setIsOpening] = useState(false);

  // 🛠️ FALLBACK: Si no hay mesas en el sistema, creamos unas virtuales para no dejar el mapa vacío
  const displayTables = useMemo(() => {
    if (tables && tables.length > 0) return tables;
    return [
      { id: '1', nombre: 'Mesa 1', estado: 'disponible', capacidad: 4 },
      { id: '2', nombre: 'Mesa 2', estado: 'disponible', capacidad: 4 },
      { id: '3', nombre: 'Mesa 3', estado: 'disponible', capacidad: 4 },
      { id: '4', nombre: 'Mesa 4', estado: 'disponible', capacidad: 4 },
    ];
  }, [tables]);

  const waiterOrders = useMemo(() => {
    if (!kitchenOrders) return [];
    return kitchenOrders.filter(o => 
      ['pending', 'preparing', 'ready', 'draft'].includes((o.estado || '').toLowerCase())
    );
  }, [kitchenOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllData();
    setRefreshing(false);
  }, [syncAllData]);

  const handleUpdateStatus = async (orderId, currentStatus) => {
    const nextStatus = currentStatus === 'ready' ? 'delivered' : 'preparing';
    const msg = currentStatus === 'ready' ? '¿Confirmas entrega?' : '¿Enviar a cocina?';
    
    showAlert('Actualizar Pedido', msg, [
      { text: 'No', style: 'cancel' },
      { 
        text: 'Sí', 
        onPress: async () => {
          setUpdatingId(orderId);
          const success = await updateOrderStatus(orderId, nextStatus);
          if (success) await syncAllData();
          setUpdatingId(null);
        }
      }
    ]);
  };

  const handleTableClick = (table) => {
    console.log('🖱️ MESA TOCADA:', JSON.stringify(table));
    setSelectedTable(table);
    if (String(table.estado).toLowerCase() === 'disponible') {
      setClienteNombre('');
      setIsClientModalVisible(true);
    } else {
      setIsActionModalVisible(true);
    }
  };

  const handleConfirmarApertura = async () => {
    if (!clienteNombre.trim()) {
      showAlert('Error', 'Ingresa el nombre del cliente');
      return;
    }
    try {
      const table = selectedTable;
      const cName = clienteNombre.trim();
      const orderId = generateOrderId('W');
      setIsClientModalVisible(false);
      setIsOpening(true);
      setUpdatingId(table?.id || 'new');
      await createDraftOrder({ orderId, cliente: cName, mesa_id: table?.id || null, usuario: 'Mesero' });
      await syncAllData();
      setIsOpening(false);
      setUpdatingId(null);
              navigation.navigate('ExplorarTab', { 
          screen: 'ProductList',
          params: {
            mesaId: table?.id || null, 
            mesaNombre: table?.nombre || 'Gral', 
            cliente: cName, 
            orderId,
            mode: 'explorar'
          }
        });
    } catch (error) {
      setIsOpening(false);
      setUpdatingId(null);
      showAlert('Error', 'No se pudo abrir la mesa.');
    }
  };

  const handleCerrarMesa = async () => {
    if (!selectedTable) return;
    
    // Buscar el pedido asociado a esta mesa para saber su estado
    const order = kitchenOrders?.find(o => o.id === selectedTable.pedido_id || o.ID_Pedido === selectedTable.pedido_id);
    const orderStatus = (order?.estado || 'draft').toLowerCase();

    const processLiberacion = async (finalStatus = null, shouldDelete = false) => {
      try {
        setIsActionModalVisible(false);
        setUpdatingId(selectedTable.id);
        
        // 1. Gestionar el pedido
        if (shouldDelete && selectedTable.pedido_id) {
          await deleteOrder(selectedTable.pedido_id);
        } else if (finalStatus && selectedTable.pedido_id) {
          await updateOrderStatus(selectedTable.pedido_id, finalStatus);
        }

        // 2. Liberar la mesa (Hard Reset)
        if (selectedTable.id != null && !['1','2','3','4'].includes(String(selectedTable.id))) {
          console.log(`🧹 Limpiando mesa ${selectedTable.id} desde Panel...`);
          await hardResetTable(selectedTable.id, selectedTable.nombre || selectedTable.id, selectedTable.capacidad || 4);
        }
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (waiterActiveSession?.mesa_id === selectedTable.id) {
          setWaiterActiveSession(null);
          clearCart();
        }
        
        await syncAllData();
        setUpdatingId(null);
      } catch (error) {
        console.error('❌ Error liberando mesa:', error);
        setUpdatingId(null);
        await syncAllData();
      }
    };

    if (orderStatus === 'draft' || !selectedTable.pedido_id) {
      // Caso 1: Es un borrador -> Borrar directamente
      showAlert('Liberar Mesa', '¿Borrar borrador y liberar mesa?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', onPress: () => processLiberacion(null, true), style: 'destructive' }
      ]);
    } else if (['ready', 'delivered'].includes(orderStatus)) {
      // Caso 2: Ya se entregó -> Marcar como Cobrado
      showAlert('Finalizar Mesa', '¿Confirmas que la mesa ha pagado?', [
        { text: 'Solo Liberar', onPress: () => processLiberacion() },
        { text: 'COBRADA ✅', onPress: () => processLiberacion('completed'), style: 'default' }
      ]);
    } else {
      // Caso 3: Está en proceso -> Preguntar si Cancelar
      showAlert('Mesa en Proceso', 'El pedido aún no se entrega. ¿Qué deseas hacer?', [
        { text: 'Volver', style: 'cancel' },
        { text: 'Solo Liberar', onPress: () => processLiberacion() },
        { text: 'CANCELAR PEDIDO ❌', onPress: () => processLiberacion('cancelled'), style: 'destructive' }
      ]);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { 
      padding: 20, 
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight + 20) : 45,
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary },
    addOrderBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    addOrderBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },
    tableGrid: { padding: 15, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tableCardWrapper: { width: (width - 45) / 2, marginBottom: 15 },
    tableCard: { height: 110, justifyContent: 'center', alignItems: 'center', borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1 },
    tableHeader: { position: 'absolute', top: 8, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' },
    tableName: { fontSize: 11, fontWeight: 'bold', color: colors.text.secondary },
    tableStatus: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    listContent: { padding: 15 },
    orderCard: { marginBottom: 12, padding: 15, borderRadius: 15, backgroundColor: colors.surface },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderId: { fontSize: 14, fontWeight: 'bold', color: colors.text.primary },
    footer: { marginTop: 15, flexDirection: 'row', justifyContent: 'flex-end' },
    actionBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
    actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 10 },
    modalOverlay: { flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', maxWidth: 400, padding: 25, borderRadius: 25, backgroundColor: colors.surface },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: colors.text.primary },
    input: { backgroundColor: colors.background, padding: 12, borderRadius: 12, marginBottom: 20, color: colors.text.primary, borderWidth: 1, borderColor: colors.border },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    cancelBtn: { padding: 12, flex: 1, alignItems: 'center' },
    confirmBtn: { backgroundColor: colors.primary, padding: 12, flex: 1, alignItems: 'center', borderRadius: 12 },
    actionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    actionItemText: { marginLeft: 12, fontWeight: 'bold', color: colors.text.primary },
    closeModalBtn: { marginTop: 20, padding: 10, alignItems: 'center' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    orderLabel: { fontSize: 10, color: colors.text.secondary, fontWeight: 'bold' },
    sectionHeader: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, letterSpacing: 1 },
    emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: colors.text.disabled, fontSize: 14, fontStyle: 'italic' },
    loadingModal: { padding: 30, borderRadius: 20, alignItems: 'center', backgroundColor: colors.surface },
    loadingText: { marginTop: 15, fontWeight: 'bold', fontSize: 16, color: colors.text.primary }
  }), [colors, darkMode]);

  const renderTableItem = (table) => {
    const status = (table.estado || '').toLowerCase();
    const config = {
      disponible: { color: colors.success, icon: 'chair', label: 'Libre' },
      ocupada: { color: colors.error, icon: 'user-friends', label: 'Elegiendo' },
      preparando: { color: colors.primary, icon: 'fire', label: 'En Cocina' },
      listo: { color: colors.success, icon: 'bell', label: '¡SERVIDOR!' }
    };
    const current = config[status] || config.disponible;

    return (
      <TouchableOpacity key={table.id} style={styles.tableCardWrapper} onPress={() => handleTableClick(table)}>
        <GlassPanel intensity={20} style={[styles.tableCard, { borderColor: current.color, borderTopWidth: 4 }]}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableName}>{table.nombre}</Text>
            {updatingId === table.id ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>
          <FontAwesome5 name={current.icon} size={24} color={current.color} />
          <Text style={[styles.tableStatus, { color: current.color, marginTop: 10 }]}>{current.label}</Text>
        </GlassPanel>
      </TouchableOpacity>
    );
  };

  const handleDeleteOrder = (orderId) => {
    console.log('🔘 BOTÓN BORRAR PRESIONADO para ID:', orderId);
    
    const executeDelete = async () => {
      console.log('🚀 INICIANDO BORRADO en Servidor para ID:', orderId);
      setUpdatingId(orderId);
      try {
        const res = await deleteOrder(orderId);
        console.log('📡 RESPUESTA DEL SERVIDOR AL BORRAR:', JSON.stringify(res, null, 2));
        
        if (res.success) {
          console.log('✅ Borrado exitoso, actualizando lista local...');
          setKitchenOrders(prev => prev.filter(o => (o.id || o.ID_Pedido) !== orderId));
        }
        await syncAllData();
      } catch (e) {
        console.error('❌ ERROR FATAL AL BORRAR:', e);
      } finally {
        setUpdatingId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro de que quieres borrar este pedido permanentemente?')) {
        executeDelete();
      }
    } else {
      showAlert('Eliminar Borrador', '¿Estás seguro de que quieres borrar este pedido permanentemente?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: executeDelete }
      ]);
    }
  };

  const renderOrderItem = ({ item }) => {
    const status = (item.estado || '').toLowerCase();
    const isReady = status === 'ready';
    const isDraft = status === 'draft';
    
    return (
      <GlassPanel intensity={15} style={[
        styles.orderCard, 
        isReady && { borderColor: colors.success, borderLeftWidth: 8 },
        isDraft && { borderColor: colors.warning, borderLeftWidth: 8, opacity: 0.9 }
      ]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderLabel}>{isDraft ? 'BORRADOR 📝' : `ORDEN #${item.id}`}</Text>
            <Text style={styles.orderId}>{item.cliente || 'Mesa'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isReady ? colors.success : (isDraft ? colors.warning : colors.primary) }]}>
            <Text style={styles.statusText}>{status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.footer}>
          {isDraft ? (
            <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: colors.warning, flex: 1 }]}
                onPress={() => {
                  const matchingTable = Array.isArray(tables) 
                    ? tables.find(t => t.pedido_id === item.id || t.pedido_id === item.ID_Orden)
                    : null;
                  const resolvedMesaId = item.mesa_id || matchingTable?.id || null;
                  const resolvedMesaNombre = item.mesa_nombre || matchingTable?.nombre || 'Gral';
                  navigation.navigate('ExplorarTab', { 
                    screen: 'ProductList',
                    params: {
                      mesaId: resolvedMesaId, 
                      mesaNombre: resolvedMesaNombre, 
                      cliente: item.cliente, 
                      orderId: item.id, 
                      isDraft: true,
                      mode: 'explorar'
                    }
                  });
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="create" size={14} color="#FFF" />
                  <Text style={[styles.actionBtnText, { marginLeft: 5 }]}>CONTINUAR</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: colors.error, width: 60, height: 45, justifyContent: 'center', alignItems: 'center' }]} 
                onPress={() => {
                  console.log('🗑️ Click en Papelera para ID:', item.id);
                  handleDeleteOrder(item.id);
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isReady ? colors.success : colors.primary }]} onPress={() => handleUpdateStatus(item.id, status)}>
              <Text style={styles.actionBtnText}>{isReady ? 'ENTREGAR' : 'NOTIFICAR'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </GlassPanel>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      
      {/* Modal de Carga para Borrado/Actualización */}
      <Modal transparent visible={updatingId !== null} animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassPanel intensity={50} style={styles.loadingModal}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Eliminando pedido...</Text>
          </GlassPanel>
        </View>
      </Modal>

      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.openDrawer()} 
            style={{ padding: spacing.sm }}
          >
            <Ionicons name="menu" size={26} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SERVICIOS 🤵</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => {
    showAlert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', onPress: () => logout(), style: 'destructive' }
    ]);
            }} style={{ marginRight: 15 }}>
            <Ionicons name="log-out-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addOrderBtn} 
            onPress={() => { 
              // 👈 Nunca más mesa_id: null. Ahora es 'Mostrador'
              setSelectedTable({ id: 'Mostrador', nombre: 'Mostrador', estado: 'disponible' }); 
              setClienteNombre(''); 
              setIsClientModalVisible(true); 
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="add" size={20} color="#FFF" /><Text style={styles.addOrderBtnText}>NUEVO</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>MAPA DE MESAS 🗺️</Text></View>
        <View style={styles.tableGrid}>{Array.isArray(tables) ? tables.map(renderTableItem) : []}</View>
        <View style={[styles.sectionHeader, { marginTop: 20 }]}><Text style={styles.sectionTitle}>CLIENTES DECIDIENDO ({(Array.isArray(waiterOrders) ? waiterOrders : []).filter(o => o.estado === 'draft').length}) 📝</Text></View>
        {(Array.isArray(waiterOrders) ? waiterOrders : []).filter(o => o.estado === 'draft').length > 0 ? (
           <View style={styles.listContent}>{(Array.isArray(waiterOrders) ? waiterOrders : []).filter(o => o.estado === 'draft').map(item => <View key={item.id}>{renderOrderItem({ item })}</View>)}</View>
        ) : (
           <View style={styles.emptyContainer}><Text style={styles.emptyText}>No hay clientes decidiendo</Text></View>
        )}
      </ScrollView>
      <Modal visible={isClientModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassPanel intensity={40} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedTable ? `Mesa: ${selectedTable.nombre}` : 'Nueva Orden'}</Text>
            <TextInput style={styles.input} placeholder="Nombre Cliente..." value={clienteNombre} onChangeText={setClienteNombre} placeholderTextColor={colors.text.disabled} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsClientModalVisible(false)}><Text style={{color: colors.text.secondary}}>VOLVER</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmarApertura}><Text style={{color:'#FFF', fontWeight:'bold'}}>ABRIR</Text></TouchableOpacity>
            </View>
          </GlassPanel>
        </View>
      </Modal>
      <Modal visible={isActionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassPanel intensity={40} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedTable?.nombre}</Text>
            <Text style={{textAlign:'center', marginBottom:20, color: colors.text.secondary}}>¿Acción para esta mesa?</Text>
            <TouchableOpacity style={styles.actionItem} onPress={() => {
              console.log('🪑 MESA SELECCIONADA (objeto completo):', JSON.stringify(selectedTable));
              setIsActionModalVisible(false);
              const params = {
                mesaId: selectedTable?.id || null, 
                mesaNombre: selectedTable?.nombre || 'Gral', 
                cliente: selectedTable?.cliente || selectedTable?.nombre || 'Mesa', 
                orderId: selectedTable?.pedido_id || `W-${Date.now()}`,
                mode: 'explorar'
              };
              console.log('📤 PARAMS ENVIADOS A ProductList:', JSON.stringify(params));
              navigation.navigate('ExplorarTab', { 
                screen: 'ProductList',
                params
              });
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="list" size={20} color={colors.primary} />
                <Text style={styles.actionItemText}>Ver Pedido</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionItem, { marginTop: 10 }]} onPress={handleCerrarMesa}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.actionItemText}>Cerrar Mesa</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setIsActionModalVisible(false)}><Text style={{color: colors.text.secondary, fontWeight: 'bold'}}>CANCELAR</Text></TouchableOpacity>
          </GlassPanel>
        </View>
      </Modal>
      <Modal visible={isOpening} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassPanel intensity={50} style={styles.loadingModal}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Abriendo la carta...</Text>
          </GlassPanel>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default WaiterScreen;
