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
      const profile = await fetchUserRoleByEmail(userEmail);
      console.log('[UserContext] Perfil cargado de Usuarios:', profile);
      
      if (profile && profile.rol) {
        console.log('📄 Rol encontrado:', profile.rol, 'ID Inicial:', profile.id);
        let finalRole = profile.rol;
        let finalId = profile.id || 'N/A';

        // 🛵 Si es repartidor, necesitamos su ID_Delivery real para que coincida con los pedidos
        const roleLow = finalRole.toLowerCase();
        if (roleLow.includes('rider') || roleLow.includes('delivery') || roleLow.includes('repartidor')) {
          try {
            const allRiders = await fetchDeliveries();
            const internalId = String(profile.id || '').trim();
            
            console.log(`[UserContext] Vinculando repartidor (ID Interno: "${internalId}", Email: "${cleanAuthEmail}")`);
            
            // Buscar por ID interno (id_user) primero, luego por email como fallback
            const myRiderInfo = allRiders.find(r => 
              (String(r.id_user || '').trim() === internalId && internalId !== '') ||
              (String(r.email || '').toLowerCase().trim() === cleanAuthEmail)
            );
            
            if (myRiderInfo) {
              console.log('🛵 Repartidor encontrado! ID Delivery:', myRiderInfo.id_delivery);
              finalId = myRiderInfo.id_delivery;
            } else {
              console.warn('[UserContext] ⚠️ No se encontró el ID de Delivery vinculado a este usuario.');
            }
          } catch (e) {
            console.warn('[UserContext] Error vinculando repartidor:', e);
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
