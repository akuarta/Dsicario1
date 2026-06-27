import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { fetchUserRoleByEmail, fetchDeliveries, saveUser, setOffline, setUserOnlineStatus } from '../utils/api';
import { useAuth } from './AuthContext';
import { CONFIG } from '../constants/Config';

const UserContext = createContext();
const PROFILE_KEY = '@dsicario_user_profile';

export const UserProvider = ({ children }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState('Usuario');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Cliente');
  const [userId, setUserId] = useState('');
  const [userTypeId, setUserTypeId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const profileLoadedRef = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClientMode, setIsClientModeState] = useState(false);

  const [transitioning, setTransitioning] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  // Animaciones
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef(null);

  // Wrapper para persistir isClientMode con animación de transición estilo InDrive
  const setIsClientMode = async (value) => {
    if (value === isClientMode) return;

    setPendingMode(value);
    setTransitioning(true);

    // Iniciar animación de entrada
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Rotación del ícono
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
    );
    spinLoop.current.start();

    // Aplicar cambio + salida del modal después de 1200ms
    setTimeout(async () => {
      setIsClientModeState(value);
      try {
        await AsyncStorage.setItem('@dsicario_client_mode', JSON.stringify(value));
      } catch (e) {
        console.warn('Error saving client mode:', e);
      }

      if (spinLoop.current) spinLoop.current.stop();
      spinAnim.setValue(0);

      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 0.85, duration: 280, useNativeDriver: true }),
      ]).start(() => {
        setTransitioning(false);
        setPendingMode(null);
      });
    }, 1200);
  };

  // Cargar perfil persistido al inicio (instantáneo antes del API)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        if (saved) {
          const p = JSON.parse(saved);
          if (p.username) setUsername(p.username);
          if (p.email) setEmail(p.email);
          if (p.role) setRole(p.role);
          if (p.userId) setUserId(p.userId);
          if (p.userTypeId) setUserTypeId(p.userTypeId);
          if (p.address) setAddress(p.address);
          if (p.phone) setPhone(p.phone);
          console.log('[UserContext] Perfil cargado de AsyncStorage:', p.role, p.userId);
        }
      } catch (e) {
        console.warn('[UserContext] Error cargando perfil:', e);
      }
      profileLoadedRef.current = true;
    };
    loadProfile();
  }, []);

  // Persistir perfil cada vez que cambie
  useEffect(() => {
    if (!profileLoadedRef.current) return;
    const profile = { username, email, role, userId, userTypeId, address, phone };
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => {});
  }, [username, email, role, userId, userTypeId, address, phone]);

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
      // Limpiar el caché de staff mode para evitar contaminación cruzada de sesiones
      AsyncStorage.removeItem('@dsicario_staff_mode').catch(()=>null);
      AsyncStorage.removeItem('@dsicario_client_mode').catch(()=>null);
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
      // y después marcar online con el userId correcto (no el Firebase UID)
      syncUserRole(user.email).then(() => {
        const resolvedId = userId || user.uid;
        console.log(`[USER_PRESENCE] 🟢 Enviando estado ONLINE: UserId=${resolvedId}`);
        markUserOnline(resolvedId, true, user.email, cleanName);
      });
      
      // 🛡️ REFUERZO: Si es el dueño, asegurar que NO esté en modo cliente por defecto
      if (user.email?.toLowerCase().trim() === CONFIG.OWNER_EMAIL) {
        setIsClientMode(false);
        setRole('Admin');
      }
    } else {
      console.log(`[USER_PRESENCE] 🔴 CIERRE DE SESIÓN DETECTADO (User es null)`);
      setUsername('Usuario');
      setEmail('');
      setRole('Cliente');
      setUserId('');
      setUserTypeId('');
      setAddress('');
      setPhone('');
      AsyncStorage.removeItem(PROFILE_KEY).catch(()=>null);
    }
    }
  }, [user]);

  // Marca Online?=TRUE o FALSE en la hoja Usuarios
  const markUserOnline = (correctUserId, isOnline, email = null, name = null) => {
    setUserOnlineStatus(correctUserId, isOnline, email, name || username).catch(e =>
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
        const isOwner = cleanAuthEmail === CONFIG.OWNER_EMAIL || finalRole?.toLowerCase() === 'owner' || finalRole?.toLowerCase() === 'admin';
        if (isOwner) {
          finalRole = 'Owner'; 
        }

        const roleLow = finalRole.toLowerCase();
        if (roleLow.includes('rider') || roleLow.includes('delivery') || roleLow.includes('repartidor') || isOwner) {
          try {
            const allRiders = await fetchDeliveries();
            const internalId = String(profile.id || '').trim();
            // 🔍 Buscar por email PRIMERO (más confiable), luego por id_user
            const myRiderInfo = allRiders.find(r => 
              (String(r.email || '').toLowerCase().trim() === cleanAuthEmail && cleanAuthEmail !== '') ||
              (String(r.id_user || '').trim() === internalId && internalId !== '') ||
              (isOwner && (r.id_delivery === CONFIG.OWNER_RIDER_ID || r.id_delivery === `${CONFIG.OWNER_RIDER_ID}1`))
            );
            if (myRiderInfo) {
              console.log('[UserContext] Delivery encontrado:', myRiderInfo.id_delivery, '| email:', myRiderInfo.email);
              finalId = myRiderInfo.id_delivery;
            } else if (isOwner) {
              finalId = CONFIG.OWNER_RIDER_ID; 
            }
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
        const isOwner = cleanAuthEmail === CONFIG.OWNER_EMAIL;
        const counts = profile?.roleCounts || {};
        const roleToAssign = isOwner ? 'Owner' : 'Cliente';
        const prefix = isOwner ? 'DS' : 'CLN';
        const nextNumber = (counts[roleToAssign.toLowerCase()] || 0) + 1;
        const newTypeId = `${prefix}${String(nextNumber).padStart(2, '0')}`;
        
        // 🔍 Buscar en Deliverys por email para evitar sobrescribir con Firebase UID
        let resolvedId = newTypeId;
        try {
          const allDeliveries = await fetchDeliveries();
          const matchedDelivery = allDeliveries.find(d => 
            String(d.email || '').toLowerCase().trim() === cleanAuthEmail
          );
          if (matchedDelivery) {
            resolvedId = matchedDelivery.id_delivery || matchedDelivery.id;
            console.log('[UserContext] Delivery encontrado por email:', resolvedId);
          }
        } catch (e) { /* ignorar */ }

        const newUser = {
          id: resolvedId,
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
        if (cleanAuthEmail === CONFIG.OWNER_EMAIL) {
          setRole('Owner');
          setUserId(CONFIG.OWNER_RIDER_ID);
        }
      }
    } catch (error) {
      console.error('Error syncing role:', error);
      if (cleanAuthEmail === CONFIG.OWNER_EMAIL) {
        setRole('Owner');
        setUserId(CONFIG.OWNER_RIDER_ID);
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
    isClientMode: (role?.toLowerCase() === 'cliente' || !role) ? true : isClientMode,
    setIsClientMode,
    syncUserRole,
    isSyncing
  }), [username, email, role, userId, user?.uid, isClientMode, isSyncing]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const switchingToClient = pendingMode === true;

  return (
    <UserContext.Provider value={value}>
      {children}

      {/* ── Modal de transición de Modo Cliente/Personal estilo InDrive ── */}
      <Modal visible={transitioning} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={{
          flex: 1,
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: overlayOpacity,
        }}>
          <Animated.View style={{
            alignItems: 'center',
            transform: [{ scale: cardScale }],
            opacity: cardOpacity,
          }}>
            {/* Círculo animado */}
            <Animated.View style={{
              width: 140, height: 140, borderRadius: 70,
              backgroundColor: switchingToClient ? 'rgba(255, 107, 53, 0.12)' : 'rgba(52, 152, 219, 0.12)',
              borderWidth: 2,
              borderColor: switchingToClient ? '#FF6B3588' : '#3498DB88',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 32,
              transform: [{ rotate: spin }],
              // Sombra / brillo
              shadowColor: switchingToClient ? '#FF6B35' : '#3498DB',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 15,
              elevation: 10,
            }}>
              <FontAwesome5
                name={switchingToClient ? 'shopping-basket' : 'user-shield'}
                size={54}
                color={switchingToClient ? '#FF6B35' : '#3498DB'}
              />
            </Animated.View>

            {/* Texto informativo */}
            <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center', marginBottom: 8 }}>
              {switchingToClient ? 'Cambiando a' : 'Iniciando'}
            </Text>
            <Text style={{
              fontSize: 22, fontWeight: '800',
              color: switchingToClient ? '#FF6B35' : '#3498DB',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {switchingToClient ? 'Modo Cliente' : 'Modo Personal'}
            </Text>
            <Text style={{ color: '#AAA', fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 20 }}>
              {switchingToClient 
                ? 'Preparando el menú y tu carrito de compras...' 
                : 'Cargando herramientas de gestión y pedidos...'}
            </Text>
          </Animated.View>
        </Animated.View>
      </Modal>
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
