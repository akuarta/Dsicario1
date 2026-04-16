import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserRoleByEmail } from '../utils/api';
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState('Usuario');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Cliente'); // Role por defecto
  const [userId, setUserId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Efecto para sincronizar el nombre desde Firebase inmediatamente
  useEffect(() => {
    if (user && user.displayName) {
      setUsername(user.displayName);
      setEmail(user.email);
    }
  }, [user]);

  // Cargar perfil completo desde Google Sheets si hay un email
  const syncUserRole = async (userEmail) => {
    if (!userEmail) return;
    
    // 🛡️ SEGURIDAD: Force Admin for owner
    if (userEmail.toLowerCase() === 'hairoman28@gmail.com') {
      console.log('🛡️ Owner detected, granting Admin access');
      setRole('Admin');
      setUsername('Hairo (Admin)');
      setEmail(userEmail);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    try {
      const profile = await fetchUserRoleByEmail(userEmail);
      if (profile) {
        // Normalización del rol (Capitalized)
        const normalizedRole = profile.role ? 
          (profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase()) : 
          'Cliente';
        
        setRole(normalizedRole);
        setUserId(profile.id || '');
        if (profile.nombre) setUsername(profile.nombre);
        setEmail(userEmail); // Asegurar que el email local esté actualizado
        
        await AsyncStorage.setItem('@dsicario_role', normalizedRole);
      }
    } catch (error) {
      console.error('Error syncing role:', error);
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
    syncUserRole,
    isSyncing
  }), [username, email, role, userId, isSyncing]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
