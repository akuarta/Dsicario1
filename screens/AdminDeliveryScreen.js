import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator
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
  const isAdmin = role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para acceder a esta sección.');
      navigation.goBack();
    }
  }, [isAdmin]);

  const { deliveries: deliverys, isSyncing, syncAllData, setDeliveries } = useDataSync();
  const [modalVisible, setModalVisible] = useState(false);
  const [editDelivery, setEditDelivery] = useState(null);
  const [refreshing, setRefreshing] = useState(false); // Local state for pull-to-refresh UI (though it triggers global sync)

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
    // Pedir permisos
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
      // Buscar el primer contacto con teléfono o abrir un modal (simplificado a leer)
      // Como Expo no tiene un picker visual nativo confiable en todas las plataformas
      // Usaremos un truco: decirle al usuario que no lo soporta de forma nativa sin UI extra,
      // a menos que listes los contactos en un Modal, o usemos una lib de picker nativo.
      // Para abreviar, lanzaremos la alerta.
      Alert.alert(
        "Importar un Contacto", 
        "Para producción se recomienda integrar 'react-native-contacts' para el picker nativo de UI. Cargando el primer contacto de tu lista como prueba...",
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
      console.log("Iniciando guardado de Repartidor...");
      
      let finalForm = { ...form };

      // Si la foto es un archivo local del dispositivo, subir a Firebase Storage
      if (finalForm.foto && finalForm.foto.startsWith('file://')) {
        console.log("Subiendo foto a Firebase Storage...");
        const response = await fetch(finalForm.foto);
        const blob = await response.blob();
        
        // Crear una referencia en Firebase única por repartidor
        const storageRef = ref(storage, `repartidores/DS_${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        
        // Obtener el enlace directo
        const downloadUrl = await getDownloadURL(storageRef);
        console.log("Foto subida correctamente:", downloadUrl);
        
        // Actualizar el form para enviarle la URL a la api de Sheets
        finalForm.foto = downloadUrl;
      }
      
      // Generar ID si es nuevo y estÃ¡ vacÃ­o
      if (!finalForm.id_delivery || finalForm.id_delivery.trim() === '') {
        const tempId = `DLV${Math.floor(100 + Math.random() * 899)}`;
        finalForm.id_delivery = tempId;
        finalForm.id = tempId;
      }

      await updateDelivery(finalForm);
      
      // Optimistic update: Si existe lo actualiza, si no, lo añade
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
      syncAllData(); // Sincronizar en segundo plano

    } catch (error) {
      console.error(error);
      Alert.alert('Error al guardar', error.message);
    }
  };

  const handleCarteraChange = (value) => {
    setForm({ ...form, cartera: parseFloat(value) || 0 });
  };

  const toggleActive = async (item) => {
    const newStatus = !item.activo;
    showConfirm(
      newStatus ? 'Activar Repartidor' : 'Desactivar Repartidor',
      `¿Seguro que quieres ${newStatus ? 'activar' : 'desactivar'} a ${item.nombre} ${item.apellido}?`,
      async () => {
        try {
          // Optimistic update
          setDeliveries(prev => prev.map(d =>
            d.id === item.id ? { ...d, activo: newStatus } : d
          ));
          
          await updateDelivery({ ...item, activo: newStatus });
          console.log(`Rider ${item.id} status updated to ${newStatus}`);
        } catch (error) {
          // Rollback on error
          setDeliveries(prev => prev.map(d =>
            d.id === item.id ? { ...d, activo: item.activo } : d
          ));
          Alert.alert('Error', 'No se pudo actualizar el estado en el servidor.');
        }
      }
    );
  };

  const renderDeliveryItem = ({ item }) => (
    <GlassPanel intensity={15} style={styles.deliveryCard}>
      <View style={styles.cardHeader}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryName}>{item.nombre} {item.apellido}</Text>
          <Text style={styles.deliveryId}>#{item.id_delivery}</Text>
        </View>
        <View style={styles.activeSwitch}>
          <Text style={{ color: item.activo ? colors.success : colors.error }}>
            {item.activo ? 'ACTIVO' : 'INACTIVO'}
          </Text>
          <Switch
            value={item.activo}
            onValueChange={() => {
              toggleActive(item);
              // Trigger sync after a small delay to allow local state update if needed,
              // or just rely on state update.
            }}
            thumbColor={item.activo ? colors.success : colors.error}
            trackColor={{ false: colors.border, true: colors.success + '40' }}
          />
        </View>
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

      {/* CARTERA - Fondo de Garantía */}
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
                setDeliveries(prev => prev.map(d =>
                  d.id === item.id ? { ...d, cartera: newAmount } : d
                ));
                await updateDelivery({ ...item, cartera: newAmount });
                Alert.alert('✅ Depósito', `RD$ 500 agregados correctamente a ${item.nombre}`);
              } catch (e) {
                setDeliveries(prev => prev.map(d => d.id === item.id ? { ...d, cartera: item.cartera } : d));
                Alert.alert('Error', 'No se pudo registrar el depósito.');
              }
            }}
          >
            <FontAwesome5 name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.addCarteraBtnText}>+RD$500</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addCarteraBtn, { backgroundColor: colors.success }]}
            onPress={async () => {
              const newAmount = item.cartera + 1000;
              try {
                setDeliveries(prev => prev.map(d =>
                  d.id === item.id ? { ...d, cartera: newAmount } : d
                ));
                await updateDelivery({ ...item, cartera: newAmount });
                Alert.alert('✅ Depósito', `RD$ 1,000 agregados correctamente a ${item.nombre}`);
              } catch (e) {
                setDeliveries(prev => prev.map(d => d.id === item.id ? { ...d, cartera: item.cartera } : d));
                Alert.alert('Error', 'No se pudo registrar el depósito.');
              }
            }}
          >
            <FontAwesome5 name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.addCarteraBtnText}>+RD$1,000</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rating Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <FontAwesome5 name="running" size={10} color={colors.text.secondary} />
          <Text style={styles.statText}>{item.rapidez}</Text>
          <Text style={styles.statLabel}>Rapidez</Text>
        </View>
        <View style={styles.statItem}>
          <FontAwesome5 name="hands-helping" size={10} color={colors.text.secondary} />
          <Text style={styles.statText}>{item.servicio}</Text>
          <Text style={styles.statLabel}>Servicio</Text>
        </View>
        <View style={styles.statItem}>
          <FontAwesome5 name="hand-holding-heart" size={10} color={colors.text.secondary} />
          <Text style={styles.statText}>{item.honestidad}</Text>
          <Text style={styles.statLabel}>Honestidad</Text>
        </View>
      </View>

      {/* PARTE NUEVA: DEUDA DE EFECTIVO (LO QUE DEBE AL LOCAL) */}
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
              if ((item.deuda_efectivo || 0) <= 0) {
                Alert.alert('Información', 'Este repartidor no tiene deuda de efectivo pendiente.');
                return;
              }
              Alert.alert(
                'Liquidar Efectivo',
                `¿Confirmas que recibiste RD$ ${item.deuda_efectivo} de ${item.nombre}? Esto pondrá su deuda en $0.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'SÍ, RECIBIDO', onPress: async () => {
                    try {
                      setUpdatingId(item.id);
                      const res = await liquidateRiderCash(item.id_delivery || item.id);
                      if (res.success) {
                        Alert.alert('✅ Liquidado', 'La deuda ha sido limpiada.');
                        syncAllData();
                      }
                    } catch (e) {
                      Alert.alert('Error', 'No se pudo liquidar la deuda.');
                    } finally {
                      setUpdatingId(null);
                    }
                  }}
                ]
              );
            }}
          >
            <FontAwesome5 name="hand-holding-usd" size={14} color="#FFFFFF" />
            <Text style={styles.addCarteraBtnText}>LIQUIDAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Performance */}
      <View style={styles.performanceRow}>
        <View style={styles.perfItem}>
          <Text style={styles.perfNumber}>{item.pedidos_dia}</Text>
          <Text style={styles.perfLabel}>Pedidos Hoy</Text>
        </View>
        <View style={styles.perfItem}>
          <Text style={styles.perfNumber}>{item.pedidos_semana}</Text>
          <Text style={styles.perfLabel}>Semana</Text>
        </View>
        <View style={styles.perfItem}>
          <Text style={styles.perfNumber}>{item.ingreso_dia}</Text>
          <Text style={styles.perfLabel}>Ingreso RD$</Text>
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

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
          onPress={() => Alert.alert('WhatsApp', 'Abrir chat con repartidor')}
        >
          <FontAwesome5 name="whatsapp" size={14} color="#FFF" />
          <Text style={styles.actionBtnText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success }]}
          onPress={() => Alert.alert('Llamar', item.telefono)}
        >
          <FontAwesome5 name="phone" size={14} color="#FFF" />
          <Text style={styles.actionBtnText}>Llamar</Text>
        </TouchableOpacity>
      </View>
    </GlassPanel>
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.md,
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
    carteraStatus: {
      fontSize: 11,
      color: colors.success,
      fontWeight: 'bold'
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

    // MODAL NUEVO ESTILO
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
      fontSize: typography.sizes.md
    },
    statsPanel: {
      padding: spacing.md,
      borderRadius: borders.radius.lg,
      gap: spacing.md
    },
    ratingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    ratingName: {
      fontWeight: '600',
      color: colors.text.primary
    },
    ratingDesc: {
      fontSize: 11,
      color: colors.text.secondary
    },
    ratingNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs
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
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15, paddingVertical: 5 }}>
            <FontAwesome5 name="arrow-left" size={20} color={colors.text.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📋 Administrar</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          setEditDelivery(null);
          setForm({
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
            activo: true
          });
          setModalVisible(true);
        }}>
          <FontAwesome5 name="plus" size={14} color="#FFF" />
          <Text style={{ color: '#FFF', marginLeft: 5 }}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={deliverys}
        renderItem={renderDeliveryItem}
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

      {/* Modal de Edición / Nuevo Repartidor */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassPanel style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editDelivery ? '✏️ Editar Repartidor' : '➕ Nuevo Repartidor'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <FontAwesome5 name="times" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>📋 Datos Básicos</Text>

                {/* FOTO PERFIL */}
                <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                  <TouchableOpacity 
                    onPress={pickImage}
                    style={{
                      width: 100, height: 100, borderRadius: 50,
                      backgroundColor: colors.surface,
                      justifyContent: 'center', alignItems: 'center',
                      borderWidth: 2, borderColor: colors.primary, overflow: 'hidden'
                    }}
                  >
                    {form.foto ? (
                      <Image source={{ uri: form.foto }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <FontAwesome5 name="camera" size={30} color={colors.text.secondary} />
                    )}
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: colors.primary, marginTop: 8, fontWeight: 'bold' }}>
                    Cambiar Foto (Drive)
                  </Text>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ID Delivery</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      value={form.id_delivery}
                      onChangeText={v => setForm({ ...form, id_delivery: v })}
                      placeholder="DS001"
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Nombre</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      value={form.nombre}
                      onChangeText={v => setForm({ ...form, nombre: v })}
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Apellido</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      value={form.apellido}
                      onChangeText={v => setForm({ ...form, apellido: v })}
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <Text style={styles.inputLabel}>📞 Teléfono</Text>
                      <TouchableOpacity onPress={() => importContact('telefono')}>
                        <FontAwesome5 name="address-book" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      value={form.telefono}
                      onChangeText={v => setForm({ ...form, telefono: v })}
                      keyboardType="phone-pad"
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                     <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={styles.inputLabel}>💬 WhatsApp</Text>
                        <TouchableOpacity onPress={() => importContact('whatsapp')}>
                          <FontAwesome5 name="address-book" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      value={form.whatsapp}
                      onChangeText={v => setForm({ ...form, whatsapp: v })}
                      keyboardType="phone-pad"
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>🏍️ Vehículo</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      value={form.vehiculo}
                      onChangeText={v => setForm({ ...form, vehiculo: v })}
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>💸 Capacidad Máx. de Cobro (Basado en Cartera)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      value={form.costo_pedido}
                      onChangeText={v => setForm({ ...form, costo_pedido: v })}
                      keyboardType="numeric"
                      placeholder="RD$ 1500"
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>💰 CARTERA (Fondo de Garantía)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
                      value={form.cartera.toString()}
                      onChangeText={handleCarteraChange}
                      keyboardType="numeric"
                      placeholder="RD$ 500.00"
                      placeholderTextColor={colors.text.disabled}
                    />
                  </View>
                </View>
              </View>


              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>⭐ Calificaciones</Text>

                <GlassPanel style={styles.statsPanel}>

                  <View style={styles.ratingRow}>
                    <View>
                      <Text style={styles.ratingName}>⚡ Rapidez</Text>
                      <Text style={styles.ratingDesc}>Tiempo de entrega</Text>
                    </View>
                    <Text style={styles.ratingNumber}>{form.rapidez}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.ratingRow}>
                    <View>
                      <Text style={styles.ratingName}>🤝 Servicio</Text>
                      <Text style={styles.ratingDesc}>Atención al cliente</Text>
                    </View>
                    <Text style={styles.ratingNumber}>{form.servicio}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.ratingRow}>
                    <View>
                      <Text style={styles.ratingName}>✅ Honestidad</Text>
                      <Text style={styles.ratingDesc}>Confianza y responsabilidad</Text>
                    </View>
                    <Text style={styles.ratingNumber}>{form.honestidad}</Text>
                  </View>
                </GlassPanel>
              </View>

            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <FontAwesome5 name="save" size={14} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </GlassPanel>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminDeliveryScreen;