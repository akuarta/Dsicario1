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
  Modal,
  TextInput,
  Switch,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { showConfirm } from '../utils/showConfirm';
import { fetchDeliveries, updateDelivery, liquidateRiderCash } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import { storage } from '../config/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AdminDeliveryScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { role } = useUser();
  const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'owner';
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección.');
      navigation.replace('ConfigScreen');
    }
  }, [isAdmin]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          onPress={() => {
            setEditDelivery(null);
            setForm({
              id_delivery: '', nombre: '', apellido: '',
              telefono: '', whatsapp: '', vehiculo: '',
              costo_pedido: '', cartera: 5.0,
              rapidez: 5.0, servicio: 5.0, honestidad: 5.0, activo: true
            });
            setModalVisible(true);
          }}
        >
          <FontAwesome5 name="plus" size={13} color="#FFF" />
          <Text style={{ color: '#FFF', marginLeft: 6, fontWeight: 'bold', fontSize: 13 }}>Nuevo</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation]);

  const { deliveries: deliverys, isSyncing, syncAllData, setDeliveries } = useDataSync();
  const [modalVisible, setModalVisible] = useState(false);
  const [editDelivery, setEditDelivery] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    id_delivery: '',
    nombre: '',
    apellido: '',
    telefono: '',
    whatsapp: '',
    vehiculo: '',
    costo_pedido: '',
    cartera: 5.0,
    rapidez: 5.0,
    servicio: 5.0,
    honestidad: 5.0,
    activo: true,
    foto: ''
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllData();
    setRefreshing(false);
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permiso Requerido", "Necesitas darnos permiso para acceder a tus fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      setForm({ ...form, foto: result.assets[0].uri });
    }
  };

  const importContact = async (field) => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Se requiere permiso para acceder a los contactos.');
      return;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
    });

    if (data.length > 0) {
      Alert.alert(
        "Importar un Contacto", 
        "Cargando el primer contacto de tu lista como prueba...",
        [
          { text: "OK", onPress: () => {
            const firstContact = data.find(c => c.phoneNumbers && c.phoneNumbers.length > 0);
            if(firstContact) {
               const phone = firstContact.phoneNumbers[0].number.replace(/[^0-9+]/g, '');
               setForm({ ...form, [field]: phone });
            }
          }}
        ]
      );
    }
  };

  const handleSave = async () => {
    try {
      let finalForm = { ...form };

      if (finalForm.foto && finalForm.foto.startsWith('file://')) {
        const response = await fetch(finalForm.foto);
        const blob = await response.blob();
        const storageRef = ref(storage, `repartidores/DS_${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        finalForm.foto = downloadUrl;
      }
      
      if (!finalForm.id_delivery || finalForm.id_delivery.trim() === '') {
        const tempId = `DLV${Math.floor(100 + Math.random() * 899)}`;
        finalForm.id_delivery = tempId;
        finalForm.id = tempId;
      }

      await updateDelivery(finalForm);
      
      setDeliveries(prev => {
        const index = prev.findIndex(d => d.id === finalForm.id);
        if (index !== -1) {
          const newArray = [...prev];
          newArray[index] = finalForm;
          return newArray;
        } else {
          return [finalForm, ...prev];
        }
      });

      Alert.alert('✅ Éxito', 'Repartidor guardado correctamente.');
      setModalVisible(false);
      syncAllData();
    } catch (error) {
      Alert.alert('Error al guardar', error.message);
    }
  };

  const toggleActive = async (item) => {
    const newStatus = !item.activo;
    showConfirm(
      newStatus ? 'Activar Repartidor' : 'Desactivar Repartidor',
      `¿Seguro que quieres ${newStatus ? 'activar' : 'desactivar'} a ${item.nombre} ${item.apellido}?`,
      async () => {
        try {
          setDeliveries(prev => prev.map(d =>
            d.id === item.id ? { ...d, activo: newStatus } : d
          ));
          await updateDelivery({ ...item, activo: newStatus });
        } catch (error) {
          setDeliveries(prev => prev.map(d =>
            d.id === item.id ? { ...d, activo: item.activo } : d
          ));
          Alert.alert('Error', 'No se pudo actualizar el estado en el servidor.');
        }
      }
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.md,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight + 20) : 45,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      ...typography.h5,
      color: '#FFFFFF',
    },
    addBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borders.radius.md,
      flexDirection: 'row',
      alignItems: 'center'
    },
    listContainer: {
      padding: spacing.md
    },
    deliveryCard: {
      borderRadius: borders.radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadows.medium
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm
    },
    deliveryInfo: {
      flex: 1
    },
    deliveryName: {
      ...typography.h6,
      color: colors.text.primary,
      fontWeight: 'bold'
    },
    deliveryId: {
      ...typography.bodySmall,
      color: colors.text.secondary,
      marginTop: spacing.xs
    },
    activeSwitch: {
      alignItems: 'center'
    },
    detailsRow: {
      flexDirection: 'row',
      marginVertical: spacing.sm
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: spacing.lg
    },
    detailText: {
      marginLeft: spacing.xs,
      color: colors.text.secondary
    },
    carteraContainer: {
      backgroundColor: colors.success + '15',
      borderWidth: 1,
      borderColor: colors.success,
      borderRadius: borders.radius.md,
      padding: spacing.sm,
      marginVertical: spacing.sm
    },
    carteraBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    carteraLabel: {
      fontSize: 10,
      color: colors.success,
      fontWeight: 'bold',
      letterSpacing: 0.5
    },
    carteraValue: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.success
    },
    addCarteraBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borders.radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs
    },
    addCarteraBtnText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 11
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: colors.primary + '10',
      borderRadius: borders.radius.md,
      paddingVertical: spacing.sm,
      marginVertical: spacing.sm
    },
    statItem: {
      alignItems: 'center'
    },
    statText: {
      marginTop: spacing.xs,
      fontWeight: 'bold',
      color: colors.text.primary
    },
    statLabel: {
      fontSize: 9,
      color: colors.text.secondary,
      marginTop: 2
    },
    performanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: spacing.sm
    },
    perfItem: {
      alignItems: 'center'
    },
    perfNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary
    },
    perfLabel: {
      fontSize: 10,
      color: colors.text.secondary
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm
    },
    actionBtn: {
      flex: 1,
      marginHorizontal: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: borders.radius.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center'
    },
    actionBtnText: {
      marginLeft: spacing.xs,
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 12
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: spacing.md
    },
    modalContent: {
      borderRadius: borders.radius.xl,
      maxHeight: '90%',
      padding: 0
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    modalTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: 'bold',
      color: colors.text.primary
    },
    closeBtn: {
      padding: spacing.sm
    },
    modalScroll: {
      paddingHorizontal: spacing.md,
      maxHeight: 550
    },
    formSection: {
      marginVertical: spacing.md
    },
    formSectionTitle: {
      fontSize: typography.sizes.md,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: spacing.md
    },
    inputRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md
    },
    inputGroup: {
      flex: 1
    },
    inputLabel: {
      fontSize: typography.sizes.sm,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.xs
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borders.radius.md,
      padding: spacing.md,
      fontSize: typography.sizes.md,
      color: colors.text.primary
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    modalBtn: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borders.radius.md,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm
    },
    cancelBtn: {
      backgroundColor: colors.border
    },
    cancelBtnText: {
      color: colors.text.secondary,
      fontWeight: '600'
    },
    saveBtn: {
      backgroundColor: colors.primary
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontWeight: 'bold'
    }
  }), [colors, darkMode]);

  const renderDeliveryItem = ({ item }) => (
    <GlassPanel intensity={15} style={styles.deliveryCard}>
      <View style={styles.cardHeader}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryName}>{item.nombre} {item.apellido}</Text>
          <Text style={styles.deliveryId}>#{item.id_delivery}</Text>
          {(() => {
            const lastSeen = item.ultima_conexion ? new Date(item.ultima_conexion) : null;
            const isOnline = lastSeen && (new Date() - lastSeen) < 300000; // 5 min
            return isOnline ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 5 }} />
                <Text style={{ fontSize: 10, color: '#4CAF50', fontWeight: 'bold' }}>EN LÍNEA</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 4 }}>
                Últ. vez: {lastSeen ? lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
              </Text>
            );
          })()}
        </View>
        <View style={styles.activeSwitch}>
          <Text style={{ color: item.activo ? colors.success : colors.error, fontSize: 10, fontWeight: 'bold' }}>
            {item.activo ? 'ACTIVO' : 'INACTIVO'}
          </Text>
          <Switch
            value={item.activo}
            onValueChange={() => toggleActive(item)}
            thumbColor={item.activo ? colors.success : colors.error}
            trackColor={{ false: colors.border, true: colors.success + '40' }}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
        <View style={{ 
          backgroundColor: item.disponible ? colors.success + '15' : colors.warning + '15',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.disponible ? colors.success : colors.warning }} />
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.disponible ? colors.success : colors.warning }}>
            {item.disponible ? 'DISPONIBLE' : 'OCUPADO / NO DISP.'}
          </Text>
        </View>
        {item.id_user ? (
          <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary }}>VINCULADO</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <FontAwesome5 name="motorcycle" size={12} color={colors.primary} />
          <Text style={styles.detailText}>{item.vehiculo}</Text>
        </View>
        <View style={styles.detailItem}>
          <FontAwesome5 name="phone" size={12} color={colors.primary} />
          <Text style={styles.detailText}>{item.telefono}</Text>
        </View>
      </View>

      <View style={styles.carteraContainer}>
        <View style={styles.carteraBox}>
          <FontAwesome5 name="piggy-bank" size={16} color={colors.primary} />
          <View>
            <Text style={styles.carteraLabel}>CARTERA (Garantía)</Text>
            <Text style={styles.carteraValue}>RD$ {item.cartera}</Text>
          </View>
          <TouchableOpacity
            style={styles.addCarteraBtn}
            onPress={async () => {
              const newAmount = item.cartera + 500;
              try {
                setDeliveries(prev => prev.map(d => d.id === item.id ? { ...d, cartera: newAmount } : d));
                await updateDelivery({ ...item, cartera: newAmount });
              } catch (e) {
                setDeliveries(prev => prev.map(d => d.id === item.id ? { ...d, cartera: item.cartera } : d));
              }
            }}
          >
            <Text style={styles.addCarteraBtnText}>+RD$500</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.carteraContainer, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
        <View style={styles.carteraBox}>
          <FontAwesome5 name="wallet" size={16} color={colors.error} />
          <View>
            <Text style={[styles.carteraLabel, { color: colors.error }]}>EFECTIVO POR ENTREGAR</Text>
            <Text style={[styles.carteraValue, { color: colors.error }]}>RD$ {item.deuda_efectivo || 0}</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.addCarteraBtn, { backgroundColor: colors.error }]}
            onPress={() => {
              if ((item.deuda_efectivo || 0) <= 0) return;
              Alert.alert(
                'Liquidar Efectivo',
                `¿Confirmas la recepción de RD$ ${item.deuda_efectivo}?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'SÍ', onPress: async () => {
                    try {
                      setUpdatingId(item.id);
                      const res = await liquidateRiderCash(item.id_delivery || item.id);
                      if (res.success) syncAllData();
                    } catch (e) {
                      Alert.alert('Error', 'No se pudo liquidar.');
                    } finally {
                      setUpdatingId(null);
                    }
                  }}
                ]
              );
            }}
          >
            <Text style={styles.addCarteraBtnText}>LIQUIDAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setEditDelivery(item);
            setForm({ ...item });
            setModalVisible(true);
          }}
        >
          <FontAwesome5 name="edit" size={14} color="#FFF" />
          <Text style={styles.actionBtnText}>Editar</Text>
        </TouchableOpacity>
      </View>
    </GlassPanel>
  );

  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        data={deliverys}
        renderItem={renderDeliveryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      />

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <GlassPanel style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editDelivery ? '✏️ Editar' : '➕ Nuevo'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <FontAwesome5 name="times" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formSection}>
                <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                  <TouchableOpacity onPress={pickImage} style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                    {form.foto ? <Image source={{ uri: form.foto }} style={{ width: '100%', height: '100%' }} /> : <FontAwesome5 name="camera" size={30} color={colors.text.secondary} />}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ID Delivery</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface }]} value={form.id_delivery} onChangeText={v => setForm({ ...form, id_delivery: v })} />
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: colors.surface }]} 
                      value={form.nombre} 
                      onChangeText={v => setForm({ ...form, nombre: v })} 
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Apellido</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: colors.surface }]} 
                      value={form.apellido} 
                      onChangeText={v => setForm({ ...form, apellido: v })} 
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Teléfono</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: colors.surface }]} 
                      value={form.telefono} 
                      onChangeText={v => setForm({ ...form, telefono: v })} 
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>WhatsApp</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: colors.surface }]} 
                      value={form.whatsapp} 
                      onChangeText={v => setForm({ ...form, whatsapp: v })} 
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Vehículo</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: colors.surface }]} 
                      value={form.vehiculo} 
                      onChangeText={v => setForm({ ...form, vehiculo: v })} 
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Costo Delivery</Text>
                    <TextInput 
                      style={[styles.input, { backgroundColor: colors.surface }]} 
                      value={String(form.costo_pedido || '')} 
                      onChangeText={v => setForm({ ...form, costo_pedido: v })} 
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </ScrollView>
          </GlassPanel>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminDeliveryScreen;