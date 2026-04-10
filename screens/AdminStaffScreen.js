import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { fetchAllUsers, saveUser } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';

const AdminStaffScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  const { users, isSyncing, syncAllData, setUsers } = useDataSync();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [editingUser, setEditingUser] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Mesero');
  const [isActive, setIsActive] = useState(true);

  const roles = ['Admin', 'Mesero', 'Cocina', 'Delivery', 'Cliente'];

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.active);
    } else {
      setEditingUser(null);
      setUsername('');
      setEmail('');
      setRole('Mesero');
      setIsActive(true);
    }
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!username || !email) {
      Alert.alert('Error', 'Nombre y Email son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      const newUser = {
        id: editingUser ? editingUser.id : `user_${Date.now()}`,
        username,
        email,
        role,
        active: isActive
      };
      
      await saveUser(newUser);

      // Optimistic update
      if (editingUser) {
        setUsers(prev => prev.map(u => u.email === email ? newUser : u));
      } else {
        setUsers(prev => [...prev, newUser]);
      }

      Alert.alert('Éxito', 'Personal actualizado');
      setIsModalVisible(false);
      
      // Sincronizar todo en segundo plano
      syncAllData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleOpenModal(item)}>
      <GlassPanel intensity={10} style={styles.userCard}>
        <View style={styles.userIcon}>
          <FontAwesome5 
            name={item.role === 'Admin' ? 'user-shield' : 'user-tie'} 
            size={20} 
            color={item.active ? colors.primary : '#999'} 
          />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text.primary }]}>{item.username}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
        <FontAwesome5 name="chevron-right" size={12} color="#CCC" />
      </GlassPanel>
    </TouchableOpacity>
  );

  const getRoleColor = (role) => {
    switch(role) {
      case 'Admin': return '#E63946';
      case 'Mesero': return '#FF8C00';
      case 'Cocina': return '#2A9D8F';
      case 'Delivery': return '#457B9D';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Personal</Text>
        <TouchableOpacity onPress={syncAllData}>
          <FontAwesome5 name="sync" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={item => `${item.email || ''}-${item.id || ''}`}
        contentContainerStyle={styles.list}
        refreshing={isSyncing}
        onRefresh={syncAllData}
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => handleOpenModal()}
      >
        <FontAwesome5 name="user-plus" size={20} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassPanel intensity={40} style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {editingUser ? 'Editar Empleado' : 'Nuevo Empleado'}
            </Text>
            
            <TextInput
              style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
              placeholder="Nombre Completo"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
            />
            
            <TextInput
              style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
              placeholder="Email (Gmail sugerido)"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!editingUser}
            />

            <Text style={[styles.label, { color: colors.text.secondary }]}>Rol en el Sistema</Text>
            <View style={styles.rolesContainer}>
              {roles.map(r => (
                <TouchableOpacity 
                  key={r}
                  style={[
                    styles.roleOption, 
                    { borderColor: colors.border },
                    role === r && { backgroundColor: getRoleColor(r), borderColor: getRoleColor(r) }
                  ]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleOptionText, role === r && { color: '#FFF' }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={{ color: colors.text.primary }}>Usuario Activo</Text>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.primary }} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={{ color: colors.text.primary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </GlassPanel>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  list: { padding: spacing.md, paddingBottom: 100 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 15,
    marginBottom: spacing.md,
  },
  userIcon: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userEmail: { fontSize: 12, color: '#999', marginBottom: 5 },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    ...shadows.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    padding: spacing.lg,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  label: { fontSize: 14, marginBottom: 10 },
  rolesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleOptionText: { fontSize: 12 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  }
});

export default AdminStaffScreen;
