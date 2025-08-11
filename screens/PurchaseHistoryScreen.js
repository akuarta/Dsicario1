import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const PurchaseHistoryScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}>Historial de Compras</Text>
    <Text style={styles.text}>Aquí se mostrarán las compras anteriores del usuario.</Text>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FF6B35', marginBottom: 12 },
  text: { fontSize: 16, color: '#333' },
});

export default PurchaseHistoryScreen;
