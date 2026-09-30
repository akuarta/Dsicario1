import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { getThemeColors } from '../theme';
import { useThemeMode } from '../contexts/ThemeContext';

const ProfileCartScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    backText: {
      marginLeft: 8,
      color: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 12,
      color: colors.primary,
    },
    text: {
      fontSize: 16,
      color: colors.text.primary,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <FontAwesome5 name="arrow-left" size={20} color={colors.primary} />
        <Text style={styles.backText}>Atrás</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={styles.title}>Mi Carrito</Text>
        <Text style={styles.text}>Aquí se mostrarán los productos de tu carrito desde el perfil.</Text>
      </View>
    </SafeAreaView>
  );
};

export default ProfileCartScreen;
