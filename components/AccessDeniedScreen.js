import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors } from '../theme/theme';
import { useUser } from '../contexts/UserContext';

const AccessDeniedScreen = ({ navigation, message }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { role } = useUser();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[colors.primary, colors.primary + 'DD']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <FontAwesome5 name="arrow-left" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Acceso Denegado</Text>
        </View>
      </LinearGradient>
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: colors.error + '20' }]}>
          <FontAwesome5 name="lock" size={30} color={colors.error} />
        </View>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Permisos Insuficientes
        </Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {message || `Tu cuenta (${role || 'sin rol'}) no tiene permisos para acceder a esta sección.`}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingVertical: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  iconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  button: { marginTop: 30, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default AccessDeniedScreen;
