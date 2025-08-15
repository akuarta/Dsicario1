import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Switch, TouchableOpacity, Alert, Platform, Modal, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getAuth, signOut } from "firebase/auth";
// import { AuthContext } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import DarkModeExample from '../components/DarkModeExample';

const { darkMode, toggleTheme: setThemeMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
const { spacing, typography, borders } = theme;

const ConfigScreen = () => {
  const navigation = useNavigation();
  const { username, setUsername, email, setEmail } = useUser();
  const [localUsername, setLocalUsername] = useState(username);
  const [localEmail, setLocalEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notifications, setNotifications] = useState(true);
  // const { logout } = useContext(AuthContext);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 24 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, alignSelf: 'center' },
    section: { marginBottom: 32 },
    label: { fontSize: 16, marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      fontSize: 16,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    button: {
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 16,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    discardButton: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    logoutButton: {
      backgroundColor: colors.error,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 4,
    },
    themeOptionText: {
      marginLeft: 8,
      fontWeight: 'bold',
    },
    modalContent: {
      padding: 20,
      borderRadius: 10,
      alignItems: 'center',
      width: '80%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    cancelButton: {
      flex: 1,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoutConfirmButton: {
      flex: 1,
      marginLeft: 8,
      backgroundColor: colors.error,
    },
  });

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

  const logout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        Alert.alert('Sesión cerrada', 'Has cerrado sesión correctamente.');
        navigation.replace('Login');
      })
      .catch((error) => {
        Alert.alert('Error', 'No se pudo cerrar la sesión.');
      });
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      setShowLogoutModal(true);
    } else {
      Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.primary }]}>Configuración</Text>
      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.text.primary }]}>Nombre de usuario</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }]}
          value={localUsername}
          onChangeText={setLocalUsername}
          placeholder="Nombre de usuario"
          placeholderTextColor={colors.text.secondary}
        />
        <Text style={[styles.label, { color: colors.text.primary }]}>Correo electrónico</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }]}
          value={localEmail}
          onChangeText={setLocalEmail}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          placeholderTextColor={colors.text.secondary}
        />
        <Text style={[styles.label, { color: colors.text.primary }]}>Contraseña actual</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Contraseña actual"
          secureTextEntry
          placeholderTextColor={colors.text.secondary}
        />
        <Text style={[styles.label, { color: colors.text.primary }]}>Nueva contraseña</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nueva contraseña"
          secureTextEntry
          placeholderTextColor={colors.text.secondary}
        />
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleChangePassword}>
          <Text style={[styles.buttonText, { color: colors.text.white }]}>Cambiar contraseña</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text.primary }]}>Notificaciones</Text>
          <Switch 
            value={notifications} 
            onValueChange={setNotifications} 
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={notifications ? colors.accent : colors.surface}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text.primary }]}>Tema</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'light' && { backgroundColor: colors.primary }]}
              onPress={() => setThemeMode('light')}
            >
              <FontAwesome5 name="sun" size={16} color={themeMode === 'light' ? colors.text.white : colors.text.secondary} />
              <Text style={[styles.themeOptionText, { color: themeMode === 'light' ? colors.text.white : colors.text.secondary }]}>
                Claro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'dark' && { backgroundColor: colors.primary }]}
              onPress={() => setThemeMode('dark')}
            >
              <FontAwesome5 name="moon" size={16} color={themeMode === 'dark' ? colors.text.white : colors.text.secondary} />
              <Text style={[styles.themeOptionText, { color: themeMode === 'dark' ? colors.text.white : colors.text.secondary }]}>Oscuro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'system' && { backgroundColor: colors.primary }]}
              onPress={() => setThemeMode('system')}
            >
              <FontAwesome5 name="mobile-alt" size={16} color={themeMode === 'system' ? colors.text.white : colors.text.secondary} />
              <Text style={[styles.themeOptionText, { color: themeMode === 'system' ? colors.text.white : colors.text.secondary }]}>Auto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Ejemplo de Modo Oscuro</Text>
        <DarkModeExample />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TouchableOpacity style={[styles.button, styles.saveButton, { flex: 1, marginRight: 8, backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={[styles.buttonText, { color: colors.text.white }]}>Guardar cambios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.discardButton, { flex: 1, marginLeft: 8, backgroundColor: colors.background, borderColor: colors.primary }]} onPress={handleDiscard}>
          <Text style={[styles.buttonText, { color: colors.primary }]}>Descartar</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.button, styles.logoutButton, { backgroundColor: colors.error }]} onPress={handleLogout}>
        <Text style={[styles.buttonText, { color: colors.text.white }]}>Cerrar sesión</Text>
      </TouchableOpacity>
      {Platform.OS === 'web' && showLogoutModal && (
        <Modal
          transparent
          animationType="fade"
          visible={showLogoutModal}
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.3)'}}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>¿Estás seguro de que quieres cerrar sesión?</Text>
              <View style={{flexDirection:'row',marginTop:16}}>
                <TouchableOpacity style={[styles.button, styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={()=>setShowLogoutModal(false)}>
                  <Text style={[styles.buttonText, { color: colors.text.primary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.logoutConfirmButton, { backgroundColor: colors.error }]} onPress={()=>{setShowLogoutModal(false);logout();}}>
                  <Text style={[styles.buttonText, { color: colors.text.white }]}>Cerrar sesión</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, alignSelf: 'center' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  label: { fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: '#fafafa',
  },
  inputDark: {
    backgroundColor: colors.surface,
    color: colors.text.white,
    borderColor: '#444',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    marginTop: 12,
  },
  discardButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    color: colors.text.white,
    fontWeight: 'bold',
    fontSize: 16,
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
  themeOptionText: {
    marginLeft: 4,
    fontWeight: 'bold',
  },
  themeOptionActive: {
    backgroundColor: colors.primary,
  },
  themeOptionBold: {
    fontWeight: 'bold',
  },
  themeOptionTextActive: {
    color: colors.text.white,
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 300,
  },
  modalContentDark: {
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text.primary,
  },
  modalTitleDark: {
    color: colors.text.white,
  },
  cancelButton: {
    backgroundColor: '#aaa',
    marginRight: 8,
  },
  cancelButtonDark: {
    backgroundColor: '#666',
  },
  buttonTextDark: {
    color: colors.text.white,
  },
});

export default ConfigScreen;