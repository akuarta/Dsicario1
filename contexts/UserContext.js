import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserRoleByEmail, fetchDeliveries } from '../utils/api';
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState('Usuario');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Cliente'); // Role por defecto
  const [userId, setUserId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClientMode, setIsClientMode] = useState(false);

  // Determinar si el usuario es puramente cliente
  useEffect(() => {
    if (role?.toLowerCase() === 'cliente' || !role) {
      setIsClientMode(true);
    } else {
      setIsClientMode(false);
    }
  }, [role]);

  // Efecto para sincronizar el nombre desde Firebase inmediatamente
  useEffect(() => {
    if (user) {
      // 🛡️ Evitar usar el UID de Firebase como nombre (a veces FB lo pone como displayName)
      const isUid = user.displayName && (user.displayName.length > 20 || user.displayName.includes('-'));
      const cleanName = (user.displayName && !isUid) ? user.displayName : user.email?.split('@')[0];
      setUsername(cleanName || 'Usuario');
      setEmail(user.email);
      
      // 🛡️ REFUERZO: Si es el dueño, asegurar que NO esté en modo cliente por defecto
      if (user.email?.toLowerCase().trim() === 'hairoman28@gmail.com') {
        setIsClientMode(false);
        setRole('Admin');
      }
    }
  }, [user]);

  // Cargar perfil completo desde Google Sheets si hay un email
  const syncUserRole = async (userEmail) => {
    const cleanAuthEmail = userEmail ? userEmail.toLowerCase().trim() : '';
    
    if (!userEmail) return;
    setIsSyncing(true);
    try {
      // 🛡️ Buscamos el rol real en la hoja primero
      const profile = await fetchUserRoleByEmail(userEmail);
      
      if (profile && profile.rol) {
        console.log('📄 Rol encontrado en hoja:', profile.rol);
        let finalRole = profile.rol;
        let finalId = profile.id || '';

        // 🛵 Si es repartidor, necesitamos su ID_Delivery real para que coincida con los pedidos
        const roleLow = finalRole.toLowerCase();
        if (roleLow.includes('rider') || roleLow.includes('delivery') || roleLow.includes('repartidor')) {
          try {
            const allRiders = await fetchDeliveries();
            const myRiderInfo = allRiders.find(r => 
              (r.email || r.Email || r.usuario || '').toLowerCase() === cleanAuthEmail
            );
            if (myRiderInfo) {
              console.log('🛵 ID de Repartidor vinculado:', myRiderInfo.id_delivery);
              finalId = myRiderInfo.id_delivery;
            }
          } catch (e) {
            console.warn('[UserContext] Error buscando ID de Delivery:', e);
          }
        }

        setRole(finalRole);
        setUsername(profile.nombre || username);
        setUserId(finalId);
      } else if (cleanAuthEmail === 'hairoman28@gmail.com') {
        // Si no hay perfil pero es el dueño, forzamos Admin
        console.log('🛡️ Owner detected but no role in sheet, forcing Admin');
        setRole('Admin');
      } else {
        setRole('Cliente');
      }
    } catch (error) {
      console.error('Error syncing role:', error);
      // Fallback para el dueño en caso de error de red
      if (cleanAuthEmail === 'hairoman28@gmail.com') {
        setRole('Admin');
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
    isClientMode, setIsClientMode,
    syncUserRole,
    isSyncing
  }), [username, email, role, userId, isClientMode, isSyncing]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
