import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useCart } from '../contexts/AppContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { showAlert } from '../utils/showAlert';
import { saveUser, saveBusinessInfo } from '../utils/api';
import LocationPickerModal from '../components/LocationPickerModal';

const ConfigPersonalDataScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const navigation = useNavigation();
  
  const { user } = useAuth();
  const { username, setUsername, address, setAddress, phone, setPhone, role } = useUser();
  const { businessInfo, updateBusinessInfo } = useCart();
  
  const isAdmin = !!(role && (role.toLowerCase() === 'admin' || role.toLowerCase() === 'owner'));
  
  const [isSaving, setIsSaving] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  
  const [tempUser, setTempUser] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    latitude: '',
    longitude: ''
  });
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (isAdmin && businessInfo) {
      setTempUser({
        nombre: businessInfo.name || '',
        direccion: businessInfo.address || '',
        telefono: businessInfo.phone || '',
        latitude: businessInfo.location?.latitude || '',
        longitude: businessInfo.location?.longitude || ''
      });
      if (businessInfo.location?.latitude && businessInfo.location?.longitude) {
        setSelectedLocation({
          latitude: parseFloat(businessInfo.location.latitude),
          longitude: parseFloat(businessInfo.location.longitude),
          address: businessInfo.address || ''
        });
      }
    } else {
      setTempUser({
        nombre: username || '',
        direccion: address || '',
        telefono: phone || '',
        latitude: '',
        longitude: ''
      });
    }
  }, [isAdmin, businessInfo, username, address, phone]);

  const savePersonalData = async () => {
    if (!tempUser.nombre.trim()) {
      showAlert('Error', isAdmin ? 'El nombre del local es obligatorio' : 'El nombre es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      if (isAdmin) {
        const payload = {
          ...businessInfo,
          name: tempUser.nombre,
          address: tempUser.direccion,
          phone: tempUser.telefono,
          location: (tempUser.latitude && tempUser.longitude) ? {
            latitude: tempUser.latitude,
            longitude: tempUser.longitude
          } : businessInfo.location
        };

        const result = await saveBusinessInfo(payload);
        if (result && result.success) {
          updateBusinessInfo(payload);
          showAlert('Éxito', 'Información del local actualizada correctamente.');
          navigation.goBack();
        } else {
          throw new Error('Error al guardar en el servidor');
        }
      } else {
        const payload = {
          id: user?.uid,
          username: tempUser.nombre,
          email: user?.email,
          direccion: tempUser.direccion,
          telefono: tempUser.telefono,
          role: role
        };

        const result = await saveUser(payload);
        
        if (result && result.success) {
          setUsername(tempUser.nombre);
          setAddress(tempUser.direccion);
          setPhone(tempUser.telefono);
          showAlert('Éxito', 'Datos actualizados correctamente.');
          navigation.goBack();
        } else {
          throw new Error('Error al guardar el perfil');
        }
      }
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudieron guardar los datos.');
    } finally {
      setIsSaving(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', padding: spacing.xl,
      backgroundColor: colors.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
      ...shadows.medium, marginBottom: spacing.lg,
    },
    backBtn: { padding: 10, marginRight: spacing.md },
    headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: '#FFFFFF' },
    content: { padding: spacing.lg },
    label: { color: colors.text.secondary, marginBottom: 5, fontSize: typography.sizes.md },
    input: {
      backgroundColor: colors.surface, padding: spacing.md, borderRadius: borders.radius.md,
      color: colors.text.primary, borderWidth: 1, borderColor: colors.border, minHeight: 50, width: '100%'
    },
    inputGroup: { marginBottom: spacing.lg },
    saveBtn: {
      backgroundColor: colors.primary, padding: spacing.md, borderRadius: borders.radius.md,
      alignItems: 'center', marginTop: spacing.xl
    },
    saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: typography.sizes.lg }
  }), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAdmin ? 'Información del Local' : 'Datos Personales'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isAdmin ? 'Nombre del Negocio' : 'Nombre Completo'}</Text>
          <TextInput
            style={styles.input}
            value={tempUser.nombre}
            onChangeText={(text) => setTempUser(prev => ({ ...prev, nombre: text }))}
            placeholder={isAdmin ? "Nombre del Local" : "Tu nombre"}
            placeholderTextColor={colors.text.light}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            value={String(tempUser.telefono || '')}
            onChangeText={(text) => setTempUser(prev => ({ ...prev, telefono: text }))}
            placeholder="809-000-0000"
            placeholderTextColor={colors.text.light}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isAdmin ? 'Dirección del Local' : 'Dirección de Envío'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', flex: 1, marginRight: 10 }]}
              value={tempUser.direccion}
              onChangeText={(text) => setTempUser(prev => ({ ...prev, direccion: text }))}
              placeholder={isAdmin ? "Dirección física..." : "Calle, Número, Sector..."}
              placeholderTextColor={colors.text.light}
              multiline
            />
            <TouchableOpacity 
              style={{ 
                backgroundColor: colors.primary, padding: 15, borderRadius: borders.radius.md, 
                justifyContent: 'center', alignItems: 'center', height: 80, width: 60
              }}
              onPress={() => setIsMapVisible(true)}
            >
              <FontAwesome5 name="map-marker-alt" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, { opacity: isSaving ? 0.7 : 1 }]} 
          onPress={savePersonalData}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <LocationPickerModal
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        onLocationSelected={(loc) => {
          setIsMapVisible(false);
          setSelectedLocation(loc);
          setTempUser(prev => ({
            ...prev,
            direccion: loc.address,
            latitude: loc.latitude.toString(),
            longitude: loc.longitude.toString()
          }));
          showAlert('Ubicación obtenida', 'Recuerda pulsar "Guardar Cambios" para aplicar esta nueva ubicación.');
        }}
        initialLocation={selectedLocation}
      />
    </SafeAreaView>
  );
};

export default ConfigPersonalDataScreen;
