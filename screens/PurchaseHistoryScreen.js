import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
// import { useTheme } from 'react-native-elements';

const PurchaseHistoryScreen = () => {
  // const { theme: { colors } } = useTheme();
  

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 12 },
    text: { fontSize: 16, color: colors.text.primary },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Historial de Compras</Text>
      <Text style={styles.text}>Aquí se mostrarán las compras anteriores del usuario.</Text>
    </SafeAreaView>
  );
};

export default PurchaseHistoryScreen;
