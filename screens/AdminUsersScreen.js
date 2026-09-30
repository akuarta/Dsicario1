import { showAlert } from '../utils/showAlert';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { fetchAllUsers, saveUser } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';
import AccessDeniedScreen from '../components/AccessDeniedScreen';

const AdminUsersScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { role } = useUser();
  const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'owner';

  if (!isAdmin) return <AccessDeniedScreen navigation={navigation} />;

  const { users, isSyncing, syncAllData, setUsers } = useDataSync();
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchText) return users;
    const search = searchText.toLowerCase();
    return users.filter(u => 
      (u.NombreUser || '').toLowerCase().includes(search) || 
      (u.EmailUser || '').toLowerCase().includes(search) ||
      (u.ID_User || '').toLowerCase().includes(search)
    );
  }, [users, searchText]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setUserName(user.NombreUser || '');
    setUserId(user.ID_User || '');
    setUserEmail(user.EmailUser || '');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!userName || !userId) {
      showAlert('Error', 'ID y Nombre son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = {
        ...editingUser,
        NombreUser: userName,
        ID_User: userId,
        EmailUser: userEmail
      };

      await saveUser(updatedUser);
      
      // Update local state
      setUsers(prev => prev.map(u => u.ID_User === editingUser.ID_User ? updatedUser : u));
      
      showAlert('Éxito', 'Usuario actualizado correctamente');
      setIsModalVisible(false);
      syncAllData();
    } catch (error) {
      showAlert('Error', 'No se pudo actualizar el usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      paddingTop: spacing.lg,
      justifyContent: 'space-between',
    },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    backBtn: { padding: 5 },
    searchContainer: {
      padding: spacing.md,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      height: 50,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 16,
      color: colors.text.primary,
    },
    list: { paddingHorizontal: spacing.md, paddingBottom: 20 },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: 20,
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    userAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
    userId: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
    userEmail: { fontSize: 12, color: colors.primary, marginTop: 2 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    modalContent: {
      padding: spacing.xl,
      borderRadius: 30,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: { 
      fontSize: 22, 
      fontWeight: 'bold', 
      marginBottom: 25, 
      textAlign: 'center',
      color: colors.text.primary 
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.text.secondary,
      marginBottom: 8,
      marginLeft: 5,
    },
    inputField: {
      height: 55,
      borderRadius: 15,
      paddingHorizontal: 15,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text.primary,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
    },
    modalBtn: {
      flex: 0.48,
      height: 55,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnText: { fontWeight: 'bold', fontSize: 16 }
  }), [colors]);

  const renderUser = ({ item }) => (
    <TouchableOpacity onPress={() => handleEdit(item)}>
      <GlassPanel intensity={10} style={styles.userCard}>
        <View style={styles.userAvatar}>
          <FontAwesome5 name="user" size={20} color={colors.primary} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.NombreUser || 'Sin Nombre'}</Text>
          <Text style={styles.userId}>ID: {item.ID_User}</Text>
          <Text style={styles.userEmail}>{item.EmailUser || 'Sin Email'}</Text>
        </View>
        <FontAwesome5 name="edit" size={14} color={colors.text.secondary} />
      </GlassPanel>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
        <TouchableOpacity onPress={syncAllData}>
          <FontAwesome5 name="sync" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={16} color={colors.primary} />
          <TextInput
            placeholder="Buscar por ID, nombre o email..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.ID_User}
        contentContainerStyle={styles.list}
        refreshing={isSyncing}
        onRefresh={syncAllData}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <FontAwesome5 name="users-slash" size={50} color={colors.border} />
            <Text style={{ marginTop: 15, color: colors.text.secondary }}>No se encontraron usuarios</Text>
          </View>
        }
      />

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassPanel intensity={40} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Usuario</Text>
            
            <Text style={styles.inputLabel}>ID DE USUARIO (ID_User)</Text>
            <TextInput
              style={[styles.inputField, { opacity: 0.6 }]}
              value={userId}
              editable={false}
            />

            <Text style={styles.inputLabel}>NOMBRE COMPLETO (NombreUser)</Text>
            <TextInput
              style={styles.inputField}
              value={userName}
              onChangeText={setUserName}
              placeholder="Ej. Juan Pérez"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>CORREO ELECTRÓNICO (EmailUser)</Text>
            <TextInput
              style={styles.inputField}
              value={userEmail}
              onChangeText={setUserEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#999"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={[styles.btnText, { color: colors.text.primary }]}>Cerrar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.btnText, { color: '#FFF' }]}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassPanel>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminUsersScreen;
