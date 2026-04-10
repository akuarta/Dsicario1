import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { fetchAllUsers, saveUser } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';

const AdminUsersScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const { users, isSyncing, syncAllData, setUsers } = useDataSync();
  const [modalVisible, setModalVisible] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    id: '',
    username: '',
    email: '',
    role: 'Mesero',
    active: true
  });

  const roles = ['Admin', 'Mesero', 'Cocina', 'Delivery', 'Cliente'];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllData();
    setRefreshing(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, []);

  const handleSave = async () => {
    if (!form.username || !form.email || !form.id) {
      Alert.alert('Error', 'Por favor completa los campos ID, Nombre y Email.');
      return;
    }

    try {
      const result = await saveUser(form);
      if (result.success) {
        
        // Optimistic update
        if (editUser) {
          setUsers(prev => prev.map(u => u.id === form.id ? form : u));
        } else {
          setUsers(prev => [...prev, form]);
        }

        Alert.alert('✅ Éxito', 'Personal actualizado correctamente.');
        setModalVisible(false);
        syncAllData(); // Background sync
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (error) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <GlassPanel intensity={15} style={styles.userCard}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.roleText, { color: colors.primary }]}>{item.role.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: item.active ? colors.success : colors.error }]} />
          <Text style={[styles.statusText, { color: item.active ? colors.success : colors.error }]}>
            {item.active ? 'ACTIVO' : 'INACTIVO'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editBtn}
          onPress={() => {
            setEditUser(item);
            setForm({ ...item });
            setModalVisible(true);
          }}
        >
          <FontAwesome5 name="edit" size={14} color={colors.primary} />
          <Text style={[styles.editText, { color: colors.primary }]}>Editar</Text>
        </TouchableOpacity>
      </View>
    </GlassPanel>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>👥 Gestión de Personal</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => {
            setEditUser(null);
            setForm({ id: `DS${Date.now().toString().slice(-4)}`, username: '', email: '', role: 'Mesero', active: true });
            setModalVisible(true);
          }}
        >
          <FontAwesome5 name="user-plus" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isSyncing && !refreshing && users.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="users-slash" size={60} color={colors.border} />
              <Text style={styles.emptyText}>No hay personal registrado</Text>
            </View>
          }
        />
      )}

      {/* Modal de Edición/Nuevo */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassPanel style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editUser ? 'Editar Empleado' : 'Nuevo Empleado'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome5 name="times" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ID Empleado (Email Ref)</Text>
                <TextInput 
                  style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
                  value={form.id}
                  onChangeText={v => setForm({...form, id: v})}
                  placeholder="ID_User"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre Completo</Text>
                <TextInput 
                  style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
                  value={form.username}
                  onChangeText={v => setForm({...form, username: v})}
                  placeholder="Nombre"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email (Firebase)</Text>
                <TextInput 
                  style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
                  value={form.email}
                  onChangeText={v => setForm({...form, email: v})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="ejemplo@dsicario.com"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Rol en el Sistema</Text>
                <View style={styles.rolesContainer}>
                  {roles.map(r => (
                    <TouchableOpacity 
                      key={r}
                      style={[
                        styles.roleOption, 
                        { borderColor: colors.border },
                        form.role === r && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setForm({...form, role: r})}
                    >
                      <Text style={[
                        styles.roleOptionText,
                        { color: colors.text.secondary },
                        form.role === r && { color: '#FFF' }
                      ]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Usuario Activo</Text>
                <Switch 
                  value={form.active}
                  onValueChange={v => setForm({...form, active: v})}
                  trackColor={{ false: colors.border, true: colors.success }}
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>Guardar Personal</Text>
              </TouchableOpacity>
            </ScrollView>
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
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  backBtn: { padding: spacing.xs },
  addBtn: { padding: spacing.xs },
  listContainer: { padding: spacing.md },
  userCard: {
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: 'bold' },
  userEmail: { fontSize: 13, color: '#999', marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: { fontSize: 10, fontWeight: '900' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: spacing.md,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  editBtn: { flexDirection: 'row', alignItems: 'center' },
  editText: { fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  formScroll: { marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#666' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleOptionText: { fontSize: 12, fontWeight: 'bold' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  saveBtn: {
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.medium,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100, opacity: 0.5 },
  emptyText: { marginTop: 20, fontSize: 16, fontWeight: 'bold' },
});

export default AdminUsersScreen;
