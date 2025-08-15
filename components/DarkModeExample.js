import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { useTheme } from 'react-native-elements';
import { FontAwesome5 } from '@expo/vector-icons';

const DarkModeExample = () => {
  // Obtenemos el estado del tema y los colores del contexto
  // const { theme: { colors, dark: darkMode }, toggleTheme: setThemeMode } = useTheme();
  const { darkMode, toggleTheme: setThemeMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const styles = StyleSheet.create({
    container: {
      padding: 16,
      borderRadius: 8,
      margin: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    infoContainer: {
      marginBottom: 20,
    },
    infoText: {
      fontSize: 16,
      marginBottom: 12,
      textAlign: 'center',
    },
    colorSample: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
    },
    colorBox: {
      width: 70,
      height: 70,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    colorText: {
      color: colors.text.white,
      fontWeight: 'bold',
      fontSize: 12,
      textAlign: 'center',
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
    },
    buttonIcon: {
      marginRight: 8,
    },
    buttonText: {
      color: colors.text.white,
      fontWeight: 'bold',
    },
  });

  // Función para cambiar el modo del tema
  const toggleThemeMode = () => {
    if (themeMode === 'light') {
      setThemeMode('dark');
    } else if (themeMode === 'dark') {
      setThemeMode('system');
    } else {
      setThemeMode('light');
    }
  };

  // Determinar el icono según el modo actual
  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return 'sun';
      case 'dark':
        return 'moon';
      default:
        return 'mobile-alt';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>
        Ejemplo de Modo Oscuro Global
      </Text>
      
      <View style={styles.infoContainer}>
        <Text style={[styles.infoText, { color: colors.text.secondary }]}>
          Modo actual: {themeMode} {darkMode ? '(oscuro)' : '(claro)'}
        </Text>
        
        <View style={[styles.colorSample, { borderColor: colors.border }]}>
          <View style={[styles.colorBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.colorText}>Primary</Text>
          </View>
          <View style={[styles.colorBox, { backgroundColor: colors.secondary }]}>
            <Text style={styles.colorText}>Secondary</Text>
          </View>
          <View style={[styles.colorBox, { backgroundColor: colors.accent }]}>
            <Text style={styles.colorText}>Accent</Text>
          </View>
          <View style={[styles.colorBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.colorText, { color: colors.text.primary }]}>Surface</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={toggleThemeMode}
      >
        <FontAwesome5 name={getThemeIcon()} size={18} color={colors.text.white} style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Cambiar Tema</Text>
      </TouchableOpacity>
    </View>
  );
};



export default DarkModeExample;