import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCart } from '../contexts/AppContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { showAlert } from '../utils/showAlert';
import { saveBusinessInfo } from '../utils/api';

const ConfigDeliveryRatesScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { businessInfo, updateBusinessInfo } = useCart();
  
  const [isSaving, setIsSaving] = useState(false);
  const [tempDelivery, setTempDelivery] = useState({
    baseFee: '100',
    expressFee: '50'
  });

  useEffect(() => {
    setTempDelivery({
      baseFee: String(businessInfo?.deliveryBaseFee || 100),
      expressFee: String(businessInfo?.expressFee || 50)
    });
  }, [businessInfo]);

  const saveDeliverySettings = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...businessInfo,
        deliveryBaseFee: parseFloat(tempDelivery.baseFee) || 0,
        expressFee: parseFloat(tempDelivery.expressFee) || 0
      };

      const result = await saveBusinessInfo(payload);
      if (result && result.success) {
        updateBusinessInfo(payload); // Actualizar globalmente
        showAlert('Éxito', 'Configuración de envíos actualizada.');
        navigation.goBack();
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (error) {
      showAlert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

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
    label: { color: colors.text.secondary, marginBottom: 5, fontSize: typography.sizes.md },
    input: {
      backgroundColor: colors.surface, padding: spacing.md, borderRadius: borders.radius.md,
      color: colors.text.primary, borderWidth: 1, borderColor: colors.border, minHeight: 50, width: '100%'
    },
    inputGroup: { marginBottom: spacing.lg },
    saveBtn: {
      backgroundColor: colors.primary, padding: spacing.md, borderRadius: borders.radius.md,
      alignItems: 'center', marginTop: spacing.xl
    },
    saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: typography.sizes.lg }
  }), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Costos de Envío</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tarifa Base de Envío (RD$)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={tempDelivery.baseFee}
            onChangeText={(text) => setTempDelivery(prev => ({ ...prev, baseFee: text }))}
            placeholder="Ej: 150"
            placeholderTextColor={colors.text.light}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recargo por Envío Express (RD$)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={tempDelivery.expressFee}
            onChangeText={(text) => setTempDelivery(prev => ({ ...prev, expressFee: text }))}
            placeholder="Ej: 50"
            placeholderTextColor={colors.text.light}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, { opacity: isSaving ? 0.7 : 1 }]} 
          onPress={saveDeliverySettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar Configuración</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfigDeliveryRatesScreen;
