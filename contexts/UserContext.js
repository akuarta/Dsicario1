import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserRoleByEmail, fetchDeliveries, saveUser, setOffline, setUserOnlineStatus } from '../utils/api';
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState('Usuario');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Cliente'); // Role por defecto
  const [userId, setUserId] = useState('');
  const [userTypeId, setUserTypeId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClientMode, setIsClientModeState] = useState(false);

  // Wrapper para persistir isClientMode
  const setIsClientMode = async (value) => {
    setIsClientModeState(value);
    try {
      await AsyncStorage.setItem('@dsicario_client_mode', JSON.stringify(value));
    } catch (e) {
      console.warn('Error saving client mode:', e);
    }
  };

  // Cargar isClientMode inicial y sincronizar con el rol
  useEffect(() => {
    const loadClientMode = async () => {
      try {
        const saved = await AsyncStorage.getItem('@dsicario_client_mode');
        if (saved !== null) {
          setIsClientModeState(JSON.parse(saved));
        }
      } catch (e) {}
    };
    loadClientMode();
  }, []);

  // Forzar modo cliente si el rol es 'Cliente' o no existe
  useEffect(() => {
    if (role?.toLowerCase() === 'cliente' || !role) {
      setIsClientModeState(true);
    }
  }, [role]);

  // Efecto para sincronizar el nombre desde Firebase inmediatamente
  useEffect(() => {
    if (user) {
      console.log(`[USER_PRESENCE] 🟢 INICIO DE SESIÓN DETECTADO: ${user.email} (UID: ${user.uid})`);
      // 🛡️ Evitar usar el UID de Firebase como nombre (a veces FB lo pone como displayName)
      const isUid = user.displayName && (user.displayName.length > 20 || user.displayName.includes('-'));
      const cleanName = (user.displayName && !isUid) ? user.displayName : user.email?.split('@')[0];
      setUsername(cleanName || 'Usuario');
      setEmail(user.email);
      
      // 🔄 Sincronizar automáticamente con Excel para traer el ID_UserType y otros datos
      syncUserRole(user.email);
      
      // 🟢 PING UNIVERSAL: marcar Online?=TRUE en Usuarios para TODOS los usuarios
      console.log(`[USER_PRESENCE] 🟢 Enviando estado ONLINE al servidor para: ${user.email}`);
      markUserOnline(user.uid, true, user.email, cleanName);
      
      // 🛡️ REFUERZO: Si es el dueño, asegurar que NO esté en modo cliente por defecto
      if (user.email?.toLowerCase().trim() === 'hairoman28@gmail.com') {
        setIsClientMode(false);
        setRole('Admin');
      }
    } else {
      console.log(`[USER_PRESENCE] 🔴 CIERRE DE SESIÓN DETECTADO (User es null)`);
      // Usuario cerró sesión
      // (El setOffline se llama explícitamente desde ProfileDrawerContent al hacer logout)
    }
  }, [user]);

  // Marca Online?=TRUE o FALSE en la hoja Usuarios para CUALQUIER usuario
  const markUserOnline = (firebaseUid, isOnline, email = null, name = null) => {
    setUserOnlineStatus(firebaseUid, isOnline, email, name || username).catch(e =>
      console.warn('[UserContext] Error marcando online status:', e)
    );
  };

  // Cargar perfil completo desde Google Sheets si hay un email
  const syncUserRole = async (userEmail) => {
    const cleanAuthEmail = userEmail ? userEmail.toLowerCase().trim() : '';
    
    if (!userEmail) return;
    setIsSyncing(true);
    try {
      const profile = await fetchUserRoleByEmail(userEmail);
      console.log('[UserContext] Perfil cargado de Usuarios:', profile);
      
      if (profile && !profile.notFound) {
        console.log('📄 Perfil encontrado en Excel:', profile.rol);
        let finalRole = profile.rol;
        let finalId = profile.id || 'N/A';

        // 👑 Soporte para el nuevo rol de "Owner"
        const isOwner = cleanAuthEmail === 'hairoman28@gmail.com' || finalRole?.toLowerCase() === 'owner' || finalRole?.toLowerCase() === 'admin';
        if (isOwner) {
          finalRole = 'Owner'; 
        }

        const roleLow = finalRole.toLowerCase();
        if (roleLow.includes('rider') || roleLow.includes('delivery') || roleLow.includes('repartidor') || isOwner) {
          try {
            const allRiders = await fetchDeliveries();
            const internalId = String(profile.id || '').trim();
            const myRiderInfo = allRiders.find(r => 
              (String(r.id_user || '').trim() === internalId && internalId !== '') ||
              (String(r.email || '').toLowerCase().trim() === cleanAuthEmail) ||
              (isOwner && (r.id_delivery === 'DS01' || r.id_delivery === 'DS001'))
            );
            if (myRiderInfo) finalId = myRiderInfo.id_delivery;
            else if (isOwner) finalId = 'DS01'; 
          } catch (e) { console.warn('Error vinculando repartidor:', e); }
        }
        
        setRole(finalRole);
        setUsername(profile.nombre || username);
        setUserId(finalId);
        
        if (!profile.userTypeId) {
          let prefix = 'CLN';
          const r = finalRole.toLowerCase();
          if (r === 'owner' || r === 'admin') prefix = 'DS';
          else if (r.includes('mesero')) prefix = 'MSR';
          else if (r.includes('cocina') || r.includes('cosina')) prefix = 'CCN';
          else if (r.includes('delivery') || r.includes('repartidor')) prefix = 'DLV';
          
          const currentCount = profile.roleCounts ? (profile.roleCounts[r] || 0) : 0;
          const newTypeId = `${prefix}${String(currentCount + 1).padStart(2, '0')}`;
          
          setUserTypeId(newTypeId);
          saveUser({ id: profile.id, id_usertype: newTypeId, role: finalRole, email: cleanAuthEmail });
        } else {
          setUserTypeId(profile.userTypeId);
        }

        setAddress(profile.direccion || '');
        setPhone(profile.telefono || '');
      } else if (profile && profile.notFound) {
        // 🆕 SOLO si se confirma que no existe el usuario
        console.log('[UserContext] Usuario no encontrado en Excel, creando como Cliente...');
        const isOwner = cleanAuthEmail === 'hairoman28@gmail.com';
        const counts = profile?.roleCounts || {};
        const roleToAssign = isOwner ? 'Owner' : 'Cliente';
        const prefix = isOwner ? 'DS' : 'CLN';
        const nextNumber = (counts[roleToAssign.toLowerCase()] || 0) + 1;
        const newTypeId = `${prefix}${String(nextNumber).padStart(2, '0')}`;
        
        const newUser = {
          id: user?.uid,
          id_usertype: newTypeId,
          username: username || user?.displayName || user?.email?.split('@')[0],
          email: cleanAuthEmail,
          role: roleToAssign,
          active: true
        };
        
        const saveResult = await saveUser(newUser);
        if (saveResult && saveResult.success) {
          setTimeout(() => syncUserRole(cleanAuthEmail), 2000);
        }
      } else {
        // Caso de error de red o profile null
        console.warn('[UserContext] No se pudo verificar el perfil (posible error de red). Manteniendo datos actuales.');
        if (cleanAuthEmail === 'hairoman28@gmail.com') {
          setRole('Owner');
          setUserId('DS01');
        }
      }
    } catch (error) {
      console.error('Error syncing role:', error);
      if (cleanAuthEmail === 'hairoman28@gmail.com') {
        setRole('Owner');
        setUserId('DS01');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // El rol ahora se gestiona exclusivamente a través de syncUserRole 
  // para mayor seguridad, evitando que roles antiguos se queden pegados.

  const value = React.useMemo(() => ({ 
    username, setUsername, 
    email, setEmail, 
    role, setRole,
    userId, setUserId,
    firebaseUid: user?.uid,
    userTypeId, setUserTypeId,
    address, setAddress,
    phone, setPhone,
    isClientMode, setIsClientMode,
    syncUserRole,
    isSyncing
  }), [username, email, role, userId, user?.uid, isClientMode, isSyncing]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
