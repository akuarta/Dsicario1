import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const { darkMode } = useThemeMode();
const colors = getThemeColors(darkMode);

const FavoritesScreen = () => {
  
  
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 12 },
    text: { fontSize: 16, color: colors.text.primary },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Favoritos</Text>
      <Text style={styles.text}>Aquí se mostrarán los productos guardados como favoritos.</Text>
    </SafeAreaView>
  );
};

export default FavoritesScreen;
