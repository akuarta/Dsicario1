import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCart } from '../contexts/AppContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { showAlert } from '../utils/showAlert';

const ConfigExchangeRatesScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  const { exchangeRates, updateExchangeRates } = useCart();
  
  const [tempRates, setTempRates] = useState({});

  useEffect(() => {
    setTempRates(exchangeRates || { USD: 58.00, EUR: 63.00, COP: 0.015, MXN: 3.50 });
  }, [exchangeRates]);

  const saveRates = () => {
    updateExchangeRates(tempRates);
    showAlert('Éxito', 'Tasas de cambio actualizadas correctamente.');
    navigation.goBack();
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
    rateInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    rateCurrency: { fontSize: typography.sizes.md, fontWeight: 'bold', color: colors.primary, width: 60 },
    rateInput: {
      flex: 1, backgroundColor: colors.surface, padding: spacing.md, borderRadius: borders.radius.md,
      color: colors.text.primary, borderWidth: 1, borderColor: colors.border, minHeight: 50
    },
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
        <Text style={styles.headerTitle}>Tasas de Cambio</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {Object.entries(tempRates).map(([currency, rate]) => (
          <View key={currency} style={styles.rateInputRow}>
            <Text style={styles.rateCurrency}>{currency}</Text>
            <TextInput
              style={styles.rateInput}
              keyboardType="numeric"
              value={String(rate)}
              onChangeText={(text) => setTempRates(prev => ({ ...prev, [currency]: parseFloat(text) || 0 }))}
              placeholderTextColor={colors.text.light}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={saveRates}>
          <Text style={styles.saveBtnText}>Guardar Tasas</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfigExchangeRatesScreen;
