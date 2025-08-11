import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Switch, TouchableOpacity, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const ConfigScreen = () => {
  const { username, setUsername, email, setEmail } = useUser();
  const [localUsername, setLocalUsername] = useState(username);
  const [localEmail, setLocalEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notifications, setNotifications] = useState(true);
  const { darkMode, themeMode, setThemeMode } = useThemeMode();

  const handleSave = () => {
    setUsername(localUsername);
    setEmail(localEmail);
    Alert.alert('Configuración guardada', 'Tus cambios han sido guardados.');
  };

  const handleDiscard = () => {
    setLocalUsername(username);
    setLocalEmail(email);
    setCurrentPassword('');
    setNewPassword('');
    Alert.alert('Cambios descartados', 'Los cambios no guardados han sido descartados.');
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Debes ingresar la contraseña actual y la nueva contraseña.');
      return;
    }
    // Aquí iría la lógica real para cambiar la contraseña
    Alert.alert('Contraseña cambiada', 'Tu contraseña ha sido actualizada.');
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => {/* lógica de logout */} },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      <Text style={styles.title}>Configuración</Text>
      <View style={styles.section}>
        <Text style={[styles.label, darkMode && styles.labelDark]}>Nombre de usuario</Text>
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={localUsername}
          onChangeText={setLocalUsername}
          placeholder="Nombre de usuario"
          placeholderTextColor={darkMode ? '#aaa' : '#888'}
        />
        <Text style={[styles.label, darkMode && styles.labelDark]}>Correo electrónico</Text>
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={localEmail}
          onChangeText={setLocalEmail}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          placeholderTextColor={darkMode ? '#aaa' : '#888'}
        />
        <Text style={[styles.label, darkMode && styles.labelDark]}>Contraseña actual</Text>
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Contraseña actual"
          secureTextEntry
          placeholderTextColor={darkMode ? '#aaa' : '#888'}
        />
        <Text style={[styles.label, darkMode && styles.labelDark]}>Nueva contraseña</Text>
        <TextInput
          style={[styles.input, darkMode && styles.inputDark]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nueva contraseña"
          secureTextEntry
          placeholderTextColor={darkMode ? '#aaa' : '#888'}
        />
        <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
          <Text style={styles.buttonText}>Cambiar contraseña</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={[styles.label, darkMode && styles.labelDark]}>Notificaciones</Text>
          <Switch value={notifications} onValueChange={setNotifications} />
        </View>
        <View style={styles.switchRow}>
          <Text style={[styles.label, darkMode && styles.labelDark]}>Tema</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'light' && styles.themeOptionActive]}
              onPress={() => setThemeMode('light')}
            >
              <FontAwesome5 name="sun" size={16} color={themeMode === 'light' ? '#FF6B35' : '#888'} />
              <Text style={[styles.themeOptionText, themeMode === 'light' && styles.themeOptionTextActive]}>Claro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'dark' && styles.themeOptionActive]}
              onPress={() => setThemeMode('dark')}
            >
              <FontAwesome5 name="moon" size={16} color={themeMode === 'dark' ? '#FF6B35' : '#888'} />
              <Text style={[styles.themeOptionText, themeMode === 'dark' && styles.themeOptionTextActive]}>Oscuro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'system' && styles.themeOptionActive]}
              onPress={() => setThemeMode('system')}
            >
              <FontAwesome5 name="mobile-alt" size={16} color={themeMode === 'system' ? '#FF6B35' : '#888'} />
              <Text style={[styles.themeOptionText, themeMode === 'system' && styles.themeOptionTextActive]}>Auto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity style={[styles.button, styles.saveButton, { flex: 1, marginRight: 8 }]} onPress={handleSave}>
          <Text style={styles.buttonText}>Guardar cambios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.discardButton, { flex: 1, marginLeft: 8 }]} onPress={handleDiscard}>
          <Text style={[styles.buttonText, { color: '#FF6B35' }]}>Descartar</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={[styles.buttonText, { color: '#fff' }]}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  containerDark: { backgroundColor: '#222' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FF6B35', marginBottom: 24, alignSelf: 'center' },
  section: { marginBottom: 32 },
  label: { fontSize: 16, color: '#333', marginBottom: 8 },
  labelDark: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  inputDark: {
    backgroundColor: '#333',
    color: '#fff',
    borderColor: '#444',
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    marginTop: 12,
  },
  discardButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  logoutButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 2,
    backgroundColor: '#eee',
  },
  themeOptionActive: {
    backgroundColor: '#FF6B35',
  },
  themeOptionText: {
    marginLeft: 4,
    color: '#888',
    fontWeight: 'bold',
  },
  themeOptionTextActive: {
    color: '#fff',
  },
});

export default ConfigScreen;
