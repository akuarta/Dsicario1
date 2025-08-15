
import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useThemeMode } from '../contexts/ThemeContext';


const ConfigScreen = () => {
  const { darkMode, toggleTheme } = useThemeMode();

  const styles = {
    container: {
      flex: 1,
      backgroundColor: darkMode ? '#1a1a1a' : '#fff',
      padding: 20,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    settingText: {
      color: darkMode ? '#fff' : '#000',
      fontSize: 18,
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingItem}>
        <Text style={styles.settingText}>Dark Mode</Text>
        <Switch
          onValueChange={toggleTheme}
          value={darkMode}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={darkMode ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>
    </View>
  );
};



export default ConfigScreen;