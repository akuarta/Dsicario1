import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { useCart } from '../contexts/AppContext';
import { CustomHeader } from '../components/CustomHeader';
import { showAlert } from '../utils/showAlert';
import { saveBusinessInfo } from '../utils/api';

const ConfigTaxScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { businessInfo, updateBusinessInfo } = useCart();

  const [taxName, setTaxName] = useState(businessInfo?.taxName || 'ITBIS');
  const [taxRate, setTaxRate] = useState(String(businessInfo?.taxRate || 18));
  const [taxEnabled, setTaxEnabled] = useState(businessInfo?.taxEnabled !== false);
  const [taxInclusive, setTaxInclusive] = useState(businessInfo?.taxInclusive === true);
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: spacing.md, paddingBottom: 100 },
    section: { backgroundColor: colors.surface, borderRadius: borders.radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.small },
    sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text.primary, marginBottom: spacing.md },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowLabel: { fontSize: typography.sizes.md, color: colors.text.primary, flex: 1 },
    rowValue: { fontSize: typography.sizes.md, color: colors.text.secondary },
    input: { backgroundColor: colors.background, borderRadius: borders.radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.sizes.md, color: colors.text.primary, marginTop: spacing.xs },
    inputLabel: { fontSize: typography.sizes.sm, color: colors.text.secondary, fontWeight: 'bold', marginBottom: spacing.xs },
    preview: { backgroundColor: colors.primary + '10', borderRadius: borders.radius.md, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.primary + '30' },
    previewLabel: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: 'bold', marginBottom: spacing.xs },
    previewValue: { fontSize: typography.sizes.xl, fontWeight: 'bold', color: colors.text.primary },
    saveBtn: { backgroundColor: colors.primary, borderRadius: borders.radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md, ...shadows.medium },
    saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: typography.sizes.md },
  }), [colors]);

  const handleSave = async () => {
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showAlert('Error', 'El porcentaje debe ser un número entre 0 y 100');
      return;
    }
    if (!taxName.trim()) {
      showAlert('Error', 'El nombre del impuesto no puede estar vacío');
      return;
    }
    setSaving(true);
    try {
      const updatedInfo = {
        ...businessInfo,
        taxName: taxName.trim(),
        taxRate: rate,
        taxEnabled,
        taxInclusive,
      };
      const res = await saveBusinessInfo(updatedInfo);
      if (res && res.success !== false) {
        updateBusinessInfo(updatedInfo);
        showAlert('Guardado', `Configuración de impuesto actualizada:\n${taxName}: ${rate}%\n${taxEnabled ? 'Habilitado' : 'Deshabilitado'}\n${taxInclusive ? 'Incluido en precio' : 'Se suma al subtotal'}`);
      } else {
        throw new Error(res?.message || 'Error en servidor');
      }
    } catch (e) {
      showAlert('Error', 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const previewAmount = 1000;
  const rate = parseFloat(taxRate) || 0;
  const taxAmount = taxEnabled ? (taxInclusive ? previewAmount - (previewAmount / (1 + rate / 100)) : previewAmount * rate / 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Configurar Impuestos" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Habilitado / Deshabilitado */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Impuesto habilitado</Text>
            <Switch
              value={taxEnabled}
              onValueChange={setTaxEnabled}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={taxEnabled ? colors.primary : colors.text.light}
            />
          </View>
        </View>

        {taxEnabled && (
          <>
            {/* Nombre del impuesto */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>NOMBRE DEL IMPUESTO</Text>
              <TextInput
                style={styles.input}
                value={taxName}
                onChangeText={setTaxName}
                placeholder="Ej: ITBIS, IVA, Tax"
                placeholderTextColor={colors.text.light}
              />
            </View>

            {/* Porcentaje */}
            <View style={styles.section}>
              <Text style={styles.inputLabel}>PORCENTAJE (%)</Text>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={setTaxRate}
                placeholder="Ej: 18"
                keyboardType="numeric"
                placeholderTextColor={colors.text.light}
              />
            </View>

            {/* Modo de aplicación */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Forma de aplicación</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Incluido en el precio</Text>
                <Switch
                  value={taxInclusive}
                  onValueChange={setTaxInclusive}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={taxInclusive ? colors.primary : colors.text.light}
                />
              </View>
              <Text style={{ fontSize: 12, color: colors.text.light, marginTop: spacing.xs }}>
                {taxInclusive
                  ? 'El impuesto ya está incluido en el precio del producto'
                  : 'El impuesto se suma al subtotal del pedido'}
              </Text>
            </View>

            {/* Vista previa */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vista Previa</Text>
              <View style={styles.preview}>
                <Text style={styles.previewLabel}>Ejemplo con compra de {previewAmount}:</Text>
                <Text style={styles.previewValue}>{taxName}: {formatPrice(taxAmount)}</Text>
                <Text style={{ color: colors.text.secondary, marginTop: spacing.xs }}>
                  {taxInclusive
                    ? `El precio de ${formatPrice(previewAmount)} ya incluye ${formatPrice(taxAmount)} de ${taxName}`
                    : `Se suman ${formatPrice(taxAmount)} de ${taxName} al subtotal`}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Guardar */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar Configuración'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const formatPrice = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export default ConfigTaxScreen;
