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
  Alert,
  Switch,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { fetchAllUsers, saveUser, deleteUser } from '../utils/api';
import { useDataSync } from '../contexts/AppContext';
import { sendLocalNotification, sendRiderPushNotification, sendWhatsAppNotification } from '../utils/notifications';

const getRoleColor = (role) => {
  switch(role) {
    case 'Admin': return '#E63946';
    case 'Mesero': return '#FF8C00';
    case 'Cocina': return '#2A9D8F';
    case 'Delivery': return '#457B9D';
    default: return '#666';
  }
};

const AdminStaffScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const { users, isSyncing, syncAllData, setUsers } = useDataSync();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('staff'); // 'all', 'staff', 'clients'
  
  // Form State
  const [editingUser, setEditingUser] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Mesero');
  const [isActive, setIsActive] = useState(true);

  // Registered Users Picker State
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifTargetUser, setNotifTargetUser] = useState(null);
  const [notifTargetAll, setNotifTargetAll] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const roles = ['Admin', 'Mesero', 'Cocina', 'Delivery', 'Cliente'];

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.NombreUser || user.nombreuser || user.username || '');
      setEmail(user.EmailUser || user.emailuser || user.email || '');
      setRole(user.Rol || user.rol || user.UserType || user.usertype || user.role || 'Mesero');
      setIsActive(user.Activo !== undefined ? user.Activo : (user['activo?'] !== undefined ? user['activo?'] : (user.active !== undefined ? user.active : true)));
    } else {
      setEditingUser(null);
      setUsername('');
      setEmail('');
      setRole('Mesero');
      setIsActive(true);
    }
    setIsModalVisible(true);
  };

  const filteredUsers = useMemo(() => {
    let result = (users || []);
    
    // Filter by type
    if (filterType === 'staff') {
      result = result.filter(u => {
        const r = (u.Rol || u.rol || u.UserType || u.usertype || u.role || '').toLowerCase();
        const isEmp = u['Empleado?'] === true || u['empleado?'] === true || u['Empleado?'] === 'SI' || u['Empleado?'] === 'si';
        return isEmp || (r && r !== 'cliente' && r !== 'customer' && r !== '');
      });
    } else if (filterType === 'clients') {
      result = result.filter(u => {
        const r = (u.Rol || u.rol || u.UserType || u.usertype || u.role || '').toLowerCase();
        const isEmp = u['Empleado?'] === true || u['empleado?'] === true || u['Empleado?'] === 'SI' || u['Empleado?'] === 'si';
        return !isEmp && (!r || r === 'cliente' || r === 'customer' || r === '');
      });
    }
    
    // Search
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(u => 
        (u.NombreUser || u.nombreuser || u.username || '').toLowerCase().includes(search) || 
        (u.EmailUser || u.emailuser || u.email || '').toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [users, searchText, filterType]);

  const registeredClients = useMemo(() => {
    let result = (users || []);
    if (pickerSearch) {
      const search = pickerSearch.toLowerCase();
      result = result.filter(u => 
        (u.NombreUser || u.nombreuser || u.username || '').toLowerCase().includes(search) || 
        (u.EmailUser || u.emailuser || u.email || '').toLowerCase().includes(search)
      );
    }
    return result;
  }, [users, pickerSearch]);

  const handleSelectFromRegistered = (user) => {
    setUsername(user.NombreUser || user.nombreuser || user.username || '');
    setEmail(user.EmailUser || user.emailuser || user.email || '');
    setIsPickerVisible(false);
  };

  const handleSave = async () => {
    if (!username || !email) {
      showAlert('Error', 'Nombre y Email son obligatorios');
      return;
    }
    setIsSaving(true);
    try {
      const existing = (users || []).find(u => (u.EmailUser || u.emailuser || u.email) === email);
      const userToSave = {
        ...(editingUser || existing || {}),
        NombreUser: username,
        nombreuser: username,
        EmailUser: email,
        emailuser: email,
        Rol: role,
        rol: role,
        UserType: role,
        usertype: role,
        'Activo': isActive,
        'activo?': isActive,
        'empleado?': true,
        ID_User: editingUser ? (editingUser.ID_User || editingUser.id_user || editingUser.id) : (existing ? (existing.ID_User || existing.id_user || existing.id) : `user_${Date.now()}`),
        id_user: editingUser ? (editingUser.ID_User || editingUser.id_user || editingUser.id) : (existing ? (existing.ID_User || existing.id_user || existing.id) : `user_${Date.now()}`)
      };
      await saveUser(userToSave);
      setUsers(prev => {
        const index = prev.findIndex(u => (u.ID_User || u.id_user || u.id) === (userToSave.ID_User || userToSave.id_user));
        if (index >= 0) {
          const updatedUsers = [...prev];
          updatedUsers[index] = userToSave;
          return updatedUsers;
        }
        return [userToSave, ...prev];
      });
      showAlert('Éxito', 'Personal actualizado');
      setIsModalVisible(false);
      syncAllData();
    } catch (error) {
      showAlert('Error', 'No se pudo guardar el usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingUser) return;
    const staffDisplayName = editingUser.NombreUser || editingUser.nombreuser || editingUser.username || 'este usuario';
    showAlert(
      '¿Quitar de Personal?',
      `¿Deseas quitar a ${staffDisplayName} como empleado? Seguirá siendo usuario (Cliente) pero ya no tendrá acceso administrativo o de staff.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Quitar de Staff', 
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const updatedUser = {
                ...editingUser,
                usertype: 'Cliente',
                'empleado?': false,
                'activo?': false
              };
              await saveUser(updatedUser);
              setUsers(prev => prev.map(u => (u.ID_User || u.id_user || u.id) === (editingUser.ID_User || editingUser.id_user || editingUser.id) ? updatedUser : u));
              showAlert('Éxito', 'Se ha reasignado como Cliente.');
              setIsModalVisible(false);
            } catch (err) {
              showAlert('Error', 'No se pudo actualizar el rol: ' + err.message);
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight + 20) : 45,
      justifyContent: 'space-between',
    },
    headerTitle: { color: colors.text.white, fontSize: 18, fontWeight: 'bold' },
    backBtn: { padding: 5 },
    list: { padding: spacing.md, paddingBottom: 100 },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: 15,
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.small,
    },
    userIcon: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
    userEmail: { fontSize: 12, color: colors.text.secondary, marginBottom: 5 },
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
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      ...shadows.medium,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      padding: spacing.lg,
      borderRadius: 25,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    modalTitle: { 
      fontSize: 20, 
      fontWeight: 'bold', 
      marginBottom: 20, 
      textAlign: 'center',
      color: colors.text.primary 
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 15,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text.primary,
    },
    label: { fontSize: 14, marginBottom: 10, color: colors.text.secondary },
    rolesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    roleOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roleOptionText: { fontSize: 12, color: colors.text.secondary },
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
    },
    searchContainer: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      height: 45,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text.primary,
      paddingVertical: 8,
    },
    filterTabs: {
      flexDirection: 'row',
      gap: 8,
    },
    filterTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    filterTabText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.text.secondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 50,
      opacity: 0.6,
    },
    emptyText: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text.secondary,
    },
    pickUserBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      marginBottom: 15,
      backgroundColor: colors.primary + '10',
    },
    pickerContent: {
      width: '100%',
      padding: spacing.md,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    pickerItemName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    pickerItemEmail: {
      fontSize: 11,
      color: colors.text.secondary,
    },
    emptyPickerText: {
      textAlign: 'center',
      padding: 20,
      color: colors.text.secondary,
      fontSize: 12,
    }
  }), [colors, darkMode]);

  const renderUserItem = ({ item }) => {
    // 🔍 Log temporal para depuración solicitado por el usuario
    console.log('Rendering user:', JSON.stringify(item, null, 2));

    const userRole = item.Rol || item.rol || item.usertype || item.role || item.UserType || 'Cliente';
    const isActiveUser = item.Activo !== undefined ? item.Activo : (item['activo?'] !== undefined ? item['activo?'] : (item.active !== undefined ? item.active : true));
    const displayName = item.NombreUser || item.nombreuser || item.username || 'Usuario';
    const displayEmail = item.EmailUser || item.emailuser || item.email || '';
    const hasPushToken = !!(item.pushToken || item.PushToken);
    const hasWhatsApp = !!(item.whatsapp && item.callmebotKey);

    return (
      <TouchableOpacity onPress={() => handleOpenModal(item)}>
        <GlassPanel intensity={10} style={styles.userCard}>
          <View style={styles.userIcon}>
            <FontAwesome5 
              name={userRole === 'Admin' ? 'user-shield' : 'user-tie'} 
              size={20} 
              color={isActiveUser ? colors.primary : '#999'} 
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text.primary }]}>{displayName}</Text>
            <Text style={styles.userEmail}>{displayEmail}</Text>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userRole) }]}>
                <Text style={styles.roleText}>{userRole}</Text>
              </View>
              {hasPushToken && <FontAwesome5 name="mobile-alt" size={10} color="#22c55e" />}
              {hasWhatsApp && <FontAwesome5 name="whatsapp" size={10} color="#25D366" />}
              {!hasPushToken && !hasWhatsApp && <FontAwesome5 name="times-circle" size={10} color="#999" />}
            </View>
          </View>
          <TouchableOpacity onPress={() => { setNotifTargetUser(item); setNotifTargetAll(false); setNotifTitle(''); setNotifBody(''); setNotifModalVisible(true); }} style={{ marginRight: 10 }}>
            <FontAwesome5 name="bell" size={16} color={hasPushToken || hasWhatsApp ? colors.primary : '#999'} />
          </TouchableOpacity>
          <FontAwesome5 name="chevron-right" size={12} color="#CCC" />
        </GlassPanel>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Gestión de Personal</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>Total: {users.length} usuarios</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <TouchableOpacity onPress={() => { setNotifTargetAll(true); setNotifTargetUser(null); setNotifTitle(''); setNotifBody(''); setNotifModalVisible(true); }}>
            <FontAwesome5 name="bell" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={syncAllData}>
            <FontAwesome5 name="sync" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FontAwesome5 name="search" size={14} color="#999" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Buscar por nombre o email..."
            placeholderTextColor="#999"
            style={[styles.searchInput, { color: colors.text.primary }]}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <FontAwesome5 name="times-circle" size={16} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <View style={styles.filterTabs}>
          {['all', 'staff', 'clients'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterTab,
                filterType === type && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[
                styles.filterTabText,
                { color: colors.text.secondary },
                filterType === type && { color: '#FFF' }
              ]}>
                {type === 'all' ? 'Todos' : type === 'staff' ? 'Personal' : 'Clientes'}
              </Text>
            </TouchableOpacity>
          ) || null)}
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item, index) => {
          const id = item.id_user || item.ID_User || item.id;
          return id ? String(id) : `user-${index}`;
        }}
        contentContainerStyle={styles.list}
        refreshing={isSyncing}
        onRefresh={syncAllData}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="users-slash" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {searchText ? 'Sin resultados para la búsqueda' : 'No hay personal registrado'}
            </Text>
          </View>
        }
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
            
            {!editingUser && (
              <TouchableOpacity 
                style={[styles.pickUserBtn, { borderColor: colors.primary }]}
                onPress={() => setIsPickerVisible(true)}
              >
                <FontAwesome5 name="users" size={14} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Seleccionar de Usuarios Registrados</Text>
              </TouchableOpacity>
            )}

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
              ) || null)}
            </View>

            <View style={styles.switchRow}>
              <Text style={{ color: colors.text.primary }}>Usuario Activo</Text>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.primary }} />
            </View>

            <View style={styles.modalActions}>
              {editingUser && editingUser.role !== 'Cliente' && (
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: '#FFEEED', flex: 0.3 }]}
                  onPress={handleDelete}
                  disabled={isSaving}
                >
                  <FontAwesome5 name="user-minus" size={14} color="#E63946" />
                </TouchableOpacity>
              )}
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

      {/* Picker Modal for Registered Users */}
      <Modal visible={isPickerVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <GlassPanel intensity={50} style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary, marginBottom: 0 }]}>Seleccionar Usuario</Text>
              <TouchableOpacity onPress={() => { setIsPickerVisible(false); setPickerSearch(''); }}>
                <FontAwesome5 name="times" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, marginVertical: 15 }]}>
              <FontAwesome5 name="search" size={12} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Buscar usuario..."
                placeholderTextColor="#999"
                style={[styles.searchInput, { color: colors.text.primary, fontSize: 14 }]}
                value={pickerSearch}
                onChangeText={setPickerSearch}
              />
            </View>

            <FlatList
              data={registeredClients}
              keyExtractor={(item, index) => {
                const id = item.id_user || item.ID_User || item.id;
                return id ? `picker-${id}` : `picker-${index}`;
              }}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const displayName = item.nombreuser || item.NombreUser || item.username || 'Usuario';
                const displayEmail = item.emailuser || item.EmailUser || item.email || '';
                return (
                  <TouchableOpacity 
                    style={styles.pickerItem}
                    onPress={() => handleSelectFromRegistered(item)}
                  >
                    <View style={styles.pickerItemIcon}>
                      <FontAwesome5 name="user" size={14} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.pickerItemName, { color: colors.text.primary }]}>{displayName}</Text>
                      <Text style={styles.pickerItemEmail}>{displayEmail}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyPickerText}>No se encontraron usuarios registrados.</Text>
              }
            />
          </GlassPanel>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal visible={notifModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <GlassPanel intensity={40} style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {notifTargetAll ? 'Notificar a Todo el Personal' : `Notificar a ${notifTargetUser?.NombreUser || notifTargetUser?.nombreuser || notifTargetUser?.username || 'Usuario'}`}
            </Text>

            {!notifTargetAll && notifTargetUser && (
              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 15 }}>
                <Text style={{ fontSize: 11, color: notifTargetUser.pushToken || notifTargetUser.PushToken ? '#22c55e' : '#999' }}>
                  Push {notifTargetUser.pushToken || notifTargetUser.PushToken ? 'SI' : 'NO'}
                </Text>
                <Text style={{ fontSize: 11, color: notifTargetUser.whatsapp && notifTargetUser.callmebotKey ? '#25D366' : '#999' }}>
                  WhatsApp {notifTargetUser.whatsapp && notifTargetUser.callmebotKey ? 'SI' : 'NO'}
                </Text>
              </View>
            )}

            <TextInput
              style={[styles.input, { color: colors.text.primary, borderColor: colors.border }]}
              placeholder="Título de la notificación"
              placeholderTextColor="#999"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <TextInput
              style={[styles.input, { color: colors.text.primary, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top' }]}
              placeholder="Mensaje de la notificación"
              placeholderTextColor="#999"
              value={notifBody}
              onChangeText={setNotifBody}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => { setNotifModalVisible(false); setNotifTargetAll(false); setNotifTargetUser(null); }}
              >
                <Text style={{ color: colors.text.primary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#2A9D8F' }]}
                onPress={async () => {
                  const title = '🔔 Notificación de Prueba';
                  const body = 'Esta es una notificación de prueba desde Gestión de Personal.';
                  const target = notifTargetAll ? 'todos' : (notifTargetUser?.NombreUser || notifTargetUser?.nombreuser || notifTargetUser?.username || 'Usuario');
                  console.log(`[AdminNotif] Test rápido para ${target}: "${title}"`);
                  setIsSendingNotif(true);
                  try {
                    if (notifTargetAll) {
                      let sent = 0;
                      for (const user of filteredUsers) {
                        const name = user.NombreUser || user.nombreuser || user.username || 'Usuario';
                        const token = user.pushToken || user.PushToken;
                        if (token) { await sendRiderPushNotification(token, { customTitle: title, customBody: body, cliente: name, orderId: 'test', total: 0, direccion: 'Test administrativo' }); sent++; }
                        else if (user.whatsapp && user.callmebotKey) { await sendWhatsAppNotification(user.whatsapp, user.callmebotKey, { customBody: `*${title}*\n${body}`, orderId: 'test', cliente: name, total: 0, direccion: 'Test administrativo' }); sent++; }
                      }
                      showAlert('Test rápido', `Notificación enviada a ${sent} empleados`);
                    } else if (notifTargetUser) {
                      const name = notifTargetUser.NombreUser || notifTargetUser.nombreuser || notifTargetUser.username || 'Usuario';
                      const token = notifTargetUser.pushToken || notifTargetUser.PushToken;
                      if (token) { await sendRiderPushNotification(token, { customTitle: title, customBody: body, cliente: name, orderId: 'test', total: 0, direccion: 'Test administrativo' }); showAlert('Test rápido', `Notificación enviada a ${name}`); }
                      else if (notifTargetUser.whatsapp && notifTargetUser.callmebotKey) { await sendWhatsAppNotification(notifTargetUser.whatsapp, notifTargetUser.callmebotKey, { customBody: `*${title}*\n${body}`, orderId: 'test', cliente: name, total: 0, direccion: 'Test administrativo' }); showAlert('Test rápido', `Notificación enviada a ${name}`); }
                      else { showAlert('Sin canal', `${name} no tiene PushToken ni WhatsApp. Debe abrir la app para generar su token.`); }
                    }
                    setNotifModalVisible(false);
                  } catch (e) {
                    console.error('[AdminNotif] Error test rápido:', e);
                    showAlert('Error', 'Falló el test: ' + (e?.message || e));
                  } finally {
                    setIsSendingNotif(false);
                  }
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>Test rápido</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  if (!notifTitle.trim() || !notifBody.trim()) {
                    showAlert('Error', 'Título y mensaje son obligatorios');
                    return;
                  }
                  setIsSendingNotif(true);
                  try {
                    if (notifTargetAll) {
                      const targets = filteredUsers;
                      let sentCount = 0;
                      let channelsUsed = [];
                      for (const user of targets) {
                        const targetName = user.NombreUser || user.nombreuser || user.username || 'Usuario';
                        const token = user.pushToken || user.PushToken;
                        if (token) {
                          await sendRiderPushNotification(token, { customTitle: notifTitle, customBody: notifBody, cliente: targetName, orderId: 'test', total: 0, direccion: 'Mensaje administrativo' });
                          channelsUsed.push('Push');
                          sentCount++;
                        } else if (user.whatsapp && user.callmebotKey) {
                          await sendWhatsAppNotification(user.whatsapp, user.callmebotKey, { customBody: `*${notifTitle}*\n${notifBody}`, orderId: 'test', cliente: targetName, total: 0, direccion: 'Mensaje administrativo' });
                          channelsUsed.push('WhatsApp');
                          sentCount++;
                        }
                      }
                      const noChannel = filteredUsers.filter(u => !(u.pushToken || u.PushToken) && !(u.whatsapp && u.callmebotKey)).length;
                      const channel = [...new Set(channelsUsed)].join(' + ') || 'ninguno';
                      console.log(`[AdminNotif] Enviado a ${sentCount} usuarios vía ${channel}. Sin canal: ${noChannel}`);
                      showAlert('Éxito', `Notificación enviada a ${sentCount} empleados (vía ${channel})${noChannel ? `\n${noChannel} sin canal configurado` : ''}`);
                    } else if (notifTargetUser) {
                      const targetName = notifTargetUser.NombreUser || notifTargetUser.nombreuser || notifTargetUser.username || 'Usuario';
                      let channelsUsed = [];
                      const token = notifTargetUser.pushToken || notifTargetUser.PushToken;
                      if (token) {
                        await sendRiderPushNotification(token, { customTitle: notifTitle, customBody: notifBody, cliente: targetName, orderId: 'test', total: 0, direccion: 'Mensaje administrativo' });
                        channelsUsed.push('Push');
                      } else if (notifTargetUser.whatsapp && notifTargetUser.callmebotKey) {
                        await sendWhatsAppNotification(notifTargetUser.whatsapp, notifTargetUser.callmebotKey, { customBody: `*${notifTitle}*\n${notifBody}`, orderId: 'test', cliente: targetName, total: 0, direccion: 'Mensaje administrativo' });
                        channelsUsed.push('WhatsApp');
                      }
                      const channel = channelsUsed.join(' + ') || 'ninguno';
                      console.log(`[AdminNotif] Enviado a ${targetName} vía ${channel}: "${notifTitle} - ${notifBody}"`);
                      if (channelsUsed.length > 0) {
                        showAlert('Éxito', `Notificación enviada a ${targetName} (vía ${channel})`);
                      } else {
                        showAlert('Sin canal', `${targetName} no tiene PushToken ni WhatsApp. Debe abrir la app para generar su token.`);
                      }
                    }
                    setNotifModalVisible(false);
                    setNotifTargetAll(false);
                    setNotifTargetUser(null);
                  } catch (e) {
                    console.error('[AdminNotif] Error:', e);
                    showAlert('Error', 'No se pudo enviar la notificación: ' + (e?.message || e));
                  } finally {
                    setIsSendingNotif(false);
                  }
                }}
                disabled={isSendingNotif}
              >
                {isSendingNotif ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </GlassPanel>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminStaffScreen;
