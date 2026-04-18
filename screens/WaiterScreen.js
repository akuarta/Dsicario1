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
import { updateOrderStatus, updateTableStatus, createDraftOrder } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const WaiterScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { kitchenOrders, tables, isSyncing, syncAllData } = useDataSync();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  
  const [isClientModalVisible, setIsClientModalVisible] = useState(false);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [isOpening, setIsOpening] = useState(false);

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
    
    Alert.alert('Actualizar Pedido', msg, [
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
      Alert.alert('Error', 'Ingresa el nombre del cliente');
      return;
    }
    try {
      const table = selectedTable;
      const cName = clienteNombre.trim();
      const orderId = `W-${Date.now()}`;
      setIsClientModalVisible(false);
      setIsOpening(true);
      setUpdatingId(table?.id || 'new');
      await createDraftOrder({ orderId, cliente: cName, mesa_id: table?.id || null, usuario: 'Mesero' });
      await syncAllData();
      setIsOpening(false);
      setUpdatingId(null);
      navigation.navigate('ExplorarTab', { mesaId: table?.id || null, mesaNombre: table?.nombre || 'Gral', cliente: cName, orderId });
    } catch (error) {
      setIsOpening(false);
      setUpdatingId(null);
      Alert.alert('Error', 'No se pudo abrir la mesa.');
    }
  };

  const handleCerrarMesa = async () => {
    if (!selectedTable) return;
    try {
      setIsActionModalVisible(false);
      setUpdatingId(selectedTable.id);
      const success = await updateTableStatus(selectedTable.id, 'disponible', '');
      if (success) await syncAllData();
      setUpdatingId(null);
    } catch (error) {
      setUpdatingId(null);
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
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
            {updatingId === table.id && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          <FontAwesome5 name={current.icon} size={24} color={current.color} />
          <Text style={[styles.tableStatus, { color: current.color, marginTop: 10 }]}>{current.label}</Text>
        </GlassPanel>
      </TouchableOpacity>
    );
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
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.warning }]}
              onPress={() => navigation.navigate('ExplorarTab', { mesaId: item.mesa_id || null, mesaNombre: item.mesa_nombre || 'Gral', cliente: item.cliente, orderId: item.id, isDraft: true })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="create" size={14} color="#FFF" /><Text style={[styles.actionBtnText, { marginLeft: 5 }]}>CONTINUAR</Text>
              </View>
            </TouchableOpacity>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.openDrawer()} 
            style={{ padding: spacing.sm }}
          >
            <Ionicons name={navigation.canGoBack() ? "arrow-back" : "menu"} size={26} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SERVICIOS 🤵</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => {
              Alert.alert('Cerrar Sesión', '¿Estás seguro de que quieres salir?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', onPress: () => logout(), style: 'destructive' }
              ]);
            }} style={{ marginRight: 15 }}>
            <Ionicons name="log-out-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addOrderBtn} onPress={() => { setSelectedTable(null); setClienteNombre(''); setIsClientModalVisible(true); }}>
            <Ionicons name="add" size={20} color="#FFF" /><Text style={styles.addOrderBtnText}>NUEVO</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>MAPA DE MESAS 🗺️</Text></View>
        <View style={styles.tableGrid}>{tables.map(renderTableItem)}</View>
        <View style={[styles.sectionHeader, { marginTop: 20 }]}><Text style={styles.sectionTitle}>CLIENTES DECIDIENDO ({waiterOrders.filter(o => o.estado === 'draft').length}) 📝</Text></View>
        {waiterOrders.filter(o => o.estado === 'draft').length > 0 ? (
          <View style={styles.listContent}>{waiterOrders.filter(o => o.estado === 'draft').map(item => <View key={item.id}>{renderOrderItem({ item })}</View>)}</View>
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
            <TouchableOpacity style={styles.actionItem} onPress={() => setIsActionModalVisible(false)}>
              <Ionicons name="list" size={20} color={colors.primary} /><Text style={styles.actionItemText}>Ver Pedido</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionItem, { marginTop: 10 }]} onPress={handleCerrarMesa}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} /><Text style={styles.actionItemText}>Cerrar Mesa</Text>
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
