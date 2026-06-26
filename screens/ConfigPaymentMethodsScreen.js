import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCart } from '../contexts/AppContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { showAlert } from '../utils/showAlert';
import { saveBusinessInfo, savePaymentMethod, saveTransferDetail, deleteTransferDetail } from '../utils/api';
import { useUser } from '../contexts/UserContext';
import AccessDeniedScreen from '../components/AccessDeniedScreen';

const PREDEFINED_METHODS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Binance', 'PayPal', 'Zelle'];

const ConfigPaymentMethodsScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { businessInfo, updateBusinessInfo } = useCart();
  const { role } = useUser();
  const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'owner';

  if (!isAdmin) return <AccessDeniedScreen navigation={navigation} />;
  
  const [isSaving, setIsSaving] = useState(false);
  const [tempPaymentMethods, setTempPaymentMethods] = useState([]);
  const [tempPaymentNotes, setTempPaymentNotes] = useState({});
  const [tempPaymentNote, setTempPaymentNote] = useState('');
  const [customMethod, setCustomMethod] = useState('');

  // Estados para Cuentas Bancarias (Transferencias)
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [tempTransfer, setTempTransfer] = useState({ Banco: '', No_Cuenta: '', Titular: '' });

  useEffect(() => {
    setTempPaymentMethods(businessInfo?.paymentMethods || ['Efectivo', 'Tarjeta']);
    setTempPaymentNotes(businessInfo?.paymentNotes || {});
    setTempPaymentNote(businessInfo?.generalPaymentNote || '');
  }, [businessInfo]);

  const togglePaymentMethod = (method) => {
    if (tempPaymentMethods.includes(method)) {
      setTempPaymentMethods(tempPaymentMethods.filter(m => m !== method));
    } else {
      setTempPaymentMethods([...tempPaymentMethods, method]);
    }
  };

  const addCustomPaymentMethod = () => {
    const trimmed = customMethod.trim();
    if (trimmed && !tempPaymentMethods.includes(trimmed)) {
      setTempPaymentMethods([...tempPaymentMethods, trimmed]);
      setCustomMethod('');
    }
  };

  const savePaymentMethodsConfig = async () => {
    setIsSaving(true);
    try {
      if (tempPaymentMethods.length === 0) {
        showAlert('Error', 'Debes incluir al menos un método de pago (ej. Efectivo)');
        setIsSaving(false);
        return;
      }
      
      const payload = {
        ...businessInfo,
        paymentMethods: tempPaymentMethods,
        paymentNotes: tempPaymentNotes,
        generalPaymentNote: tempPaymentNote
      };

      const result = await saveBusinessInfo(payload);
      if (result && result.success) {
        // Guardar cada método en la hoja Metodos_pagos
        for (const method of tempPaymentMethods) {
          const detailed = businessInfo.paymentMethodsDetailed?.find(m => m['Metodo Pago'] === method);
          await savePaymentMethod({
            'Metodo Pago': method,
            'Tipo Entrega': detailed ? detailed['Tipo Entrega'] : 'ambos'
          });
        }
        
        updateBusinessInfo(payload);
        showAlert('Éxito', 'Métodos de pago actualizados.');
        navigation.goBack();
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (error) {
      showAlert('Error', 'No se pudieron guardar los métodos de pago.');
    } finally {
      setIsSaving(false);
    }
  };

  // En Web usamos un render condicional absoluto para el modal de bancos para evitar congelamientos
  const ModalWrapper = Platform.OS === 'web' ? View : Modal;
  const modalProps = Platform.OS === 'web' 
    ? { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: transferModalVisible ? 'flex' : 'none' } }
    : { visible: transferModalVisible, animationType: "fade", transparent: true };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', padding: spacing.xl,
      backgroundColor: colors.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
      ...shadows.medium, marginBottom: spacing.lg,
    },
    backBtn: { padding: 10, marginRight: spacing.md },
    headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: '#FFFFFF' },
    content: { padding: spacing.lg },
    rateInput: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: borders.radius.md, color: colors.text.primary, borderWidth: 1, borderColor: colors.border },
    saveBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borders.radius.md, alignItems: 'center', marginTop: spacing.xl },
    saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: typography.sizes.lg },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
    modalContent: { backgroundColor: colors.background, borderRadius: borders.radius.lg, padding: spacing.xl, ...shadows.large },
    modalTitle: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.lg, textAlign: 'center' },
    modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
    modalBtn: { flex: 1, padding: spacing.md, borderRadius: borders.radius.md, alignItems: 'center' },
    modalBtnCancel: { backgroundColor: colors.surface, marginRight: spacing.sm },
    modalBtnSave: { backgroundColor: colors.primary, marginLeft: spacing.sm }
  }), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={{ color: colors.text.secondary, marginBottom: 15, fontSize: 13, textAlign: 'center' }}>
          Activa los métodos de pago que deseas aceptar. También puedes añadir nuevos.
        </Text>
        
        {Array.from(new Set([...PREDEFINED_METHODS, ...tempPaymentMethods])).map(method => {
          const isEnabled = tempPaymentMethods.includes(method);
          return (
            <View key={method} style={{ marginBottom: 15, paddingHorizontal: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.text.primary, fontSize: 16 }}>{method}</Text>
                <Switch 
                  value={isEnabled} 
                  onValueChange={() => togglePaymentMethod(method)}
                  trackColor={{ false: colors.border, true: colors.primary }} 
                  thumbColor="white" 
                />
              </View>
              {isEnabled && (
                <View style={{ marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.primary + '30' }}>
                  <Text style={{ color: colors.text.secondary, fontSize: 11, marginBottom: 5 }}>Disponible para:</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {['delivery', 'local', 'ambos'].map(type => {
                      const detailed = businessInfo?.paymentMethodsDetailed?.find(m => m['Metodo Pago'] === method);
                      const currentType = detailed ? (detailed['Tipo Entrega'] || 'ambos').toLowerCase() : 'ambos';
                      const isTypeActive = type === 'ambos' ? (currentType !== 'delivery' && currentType !== 'local') : currentType.includes(type);
                      
                      return (
                        <TouchableOpacity 
                          key={type}
                          onPress={async () => {
                            const updatedDetailed = (businessInfo.paymentMethodsDetailed || []).map(m => 
                              m['Metodo Pago'] === method ? { ...m, 'Tipo Entrega': type } : m
                            );
                            if (!updatedDetailed.find(m => m['Metodo Pago'] === method)) {
                              updatedDetailed.push({ 'Metodo Pago': method, 'Tipo Entrega': type });
                            }
                            updateBusinessInfo({ ...businessInfo, paymentMethodsDetailed: updatedDetailed });
                          }}
                          style={{ 
                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, 
                            backgroundColor: isTypeActive ? colors.primary : colors.background,
                            borderWidth: 1, borderColor: isTypeActive ? colors.primary : colors.border
                          }}
                        >
                          <Text style={{ fontSize: 10, color: isTypeActive ? 'white' : colors.text.secondary, fontWeight: 'bold' }}>
                            {type.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    style={[styles.rateInput, { marginTop: 8, minHeight: 40, padding: 10, fontSize: 12 }]}
                    value={tempPaymentNotes[method] || ''}
                    onChangeText={(text) => setTempPaymentNotes(prev => ({ ...prev, [method]: text }))}
                    placeholder="Instrucción corta (opcional)"
                    placeholderTextColor={colors.text.light}
                  />

                  {/* Botón para Cuentas Bancarias si es Transferencia */}
                  {method === 'Transferencia' && (
                    <TouchableOpacity 
                      style={{ marginTop: 10, backgroundColor: colors.primary + '20', padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => setTransferModalVisible(true)}
                    >
                      <FontAwesome5 name="university" size={14} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>Gestionar Cuentas Bancarias</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ marginBottom: spacing.md, marginTop: spacing.md }}>
          <Text style={{ color: colors.text.secondary, fontSize: 13, marginBottom: 8, fontWeight: 'bold' }}>
            Nota / Instrucción General (Opcional):
          </Text>
          <TextInput
            style={[styles.rateInput, { minHeight: 60, padding: 10, fontSize: 13, textAlignVertical: 'top' }]}
            value={tempPaymentNote}
            onChangeText={setTempPaymentNote}
            placeholder="Ej. 'Por temas de seguridad no aceptamos tarjetas.'"
            placeholderTextColor={colors.text.light}
            multiline
          />
        </View>

        <View style={{ flexDirection: 'row', marginBottom: spacing.md, alignItems: 'center' }}>
          <TextInput
            style={[styles.rateInput, { flex: 1, minHeight: 40, padding: 10, marginRight: 10 }]}
            value={customMethod}
            onChangeText={setCustomMethod}
            placeholder="Añadir otro (ej. Zelle)"
            placeholderTextColor={colors.text.light}
          />
          <TouchableOpacity 
            onPress={addCustomPaymentMethod} 
            style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
          >
            <FontAwesome5 name="plus" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, { opacity: isSaving ? 0.7 : 1 }]} 
          onPress={savePaymentMethodsConfig}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar Configuración</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL / VIEW PARA TRANSFERENCIAS BANCARIAS */}
      {(!Platform.OS === 'web' || transferModalVisible) && (
        <ModalWrapper {...modalProps}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditingBank ? 'Editar Datos de Banco' : 'Cuentas Bancarias'}</Text>
              
              {!isEditingBank ? (
                <View>
                  <ScrollView style={{ maxHeight: 300, marginBottom: spacing.md }} showsVerticalScrollIndicator={false}>
                    {(!businessInfo?.transferDetails || businessInfo.transferDetails.length === 0) && (
                      <Text style={{ textAlign: 'center', color: colors.text.light, marginVertical: 20 }}>No hay bancos registrados</Text>
                    )}
                    {businessInfo?.transferDetails?.map((bank, index) => (
                      <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderRadius: borders.radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 16 }}>{bank.Banco}</Text>
                          <Text style={{ color: colors.text.primary, fontSize: 13 }}>{bank.No_Cuenta || bank.Cuenta}</Text>
                          <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{bank.Titular}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 15, paddingRight: 10 }}>
                          <TouchableOpacity onPress={() => { setTempTransfer(bank); setIsEditingBank(true); }}>
                            <FontAwesome5 name="edit" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => {
                            showAlert('Eliminar', `¿Seguro que deseas borrar la cuenta del ${bank.Banco}?`, [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Borrar', style: 'destructive', onPress: async () => {
                                  setIsSaving(true);
                                  try {
                                    if (bank.Id_transf) {
                                      await deleteTransferDetail(bank.Id_transf);
                                    }
                                    const updated = businessInfo.transferDetails.filter(t => t !== bank);
                                    updateBusinessInfo({ ...businessInfo, transferDetails: updated });
                                    showAlert('Éxito', 'Cuenta borrada.');
                                  } catch (e) {
                                    showAlert('Error', 'No se pudo borrar.');
                                  } finally {
                                    setIsSaving(false);
                                  }
                              }}
                            ]);
                          }}>
                            <FontAwesome5 name="trash" size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                  
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.modalBtnSave, { width: '100%', marginBottom: 15 }]} 
                    onPress={() => {
                      setTempTransfer({ Banco: '', No_Cuenta: '', Titular: '' });
                      setIsEditingBank(true);
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'center' }}>+ Añadir Banco</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.modalBtnCancel, { width: '100%', marginHorizontal: 0 }]} 
                    onPress={() => setTransferModalVisible(false)}
                  >
                    <Text style={{ color: colors.text.primary, fontWeight: 'bold', textAlign: 'center' }}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Nombre del Banco</Text>
                    <TextInput
                      style={styles.rateInput}
                      value={tempTransfer.Banco}
                      onChangeText={(val) => setTempTransfer(prev => ({ ...prev, Banco: val }))}
                      placeholder="Ej: BanReservas"
                      placeholderTextColor={colors.text.light}
                    />
                  </View>

                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Número de Cuenta</Text>
                    <TextInput
                      style={styles.rateInput}
                      value={tempTransfer.No_Cuenta}
                      onChangeText={(val) => setTempTransfer(prev => ({ ...prev, No_Cuenta: val }))}
                      placeholder="000-0000000-0"
                      placeholderTextColor={colors.text.light}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={{ color: colors.text.secondary, marginBottom: 5 }}>Titular de la Cuenta</Text>
                    <TextInput
                      style={styles.rateInput}
                      value={tempTransfer.Titular}
                      onChangeText={(val) => setTempTransfer(prev => ({ ...prev, Titular: val }))}
                      placeholder="Nombre completo"
                      placeholderTextColor={colors.text.light}
                    />
                  </View>

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity 
                      style={[styles.modalBtn, styles.modalBtnCancel]} 
                      onPress={() => setIsEditingBank(false)}
                      disabled={isSaving}
                    >
                      <Text style={{ color: colors.text.primary, fontWeight: 'bold' }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalBtn, styles.modalBtnSave]} 
                      onPress={async () => {
                        setIsSaving(true);
                        try {
                          const res = await saveTransferDetail(tempTransfer);
                          if (res && res.success) {
                            const updated = businessInfo.transferDetails || [];
                            const idx = updated.findIndex(t => (t.Id_transf && t.Id_transf === tempTransfer.Id_transf) || (t.Banco === tempTransfer.Banco && !t.Id_transf));
                            if (idx >= 0) updated[idx] = { ...updated[idx], ...tempTransfer };
                            else updated.push(tempTransfer);
                            
                            updateBusinessInfo({ ...businessInfo, transferDetails: updated });
                            showAlert('Éxito', 'Datos bancarios guardados.');
                            setIsEditingBank(false);
                          }
                        } catch (e) {
                          showAlert('Error', 'No se pudo guardar.');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ModalWrapper>
      )}
    </SafeAreaView>
  );
};

export default ConfigPaymentMethodsScreen;
