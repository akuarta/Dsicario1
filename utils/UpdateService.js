import { db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import NotificationService from './notificationService';
import { Alert, Platform } from 'react-native';

const APP_CONFIG_COLLECTION = 'app_config';
const VERSION_CONTROL_DOC = 'version_control';

/**
 * UpdateService
 * Compara la versión local con la de Firestore y avisa si hay actualización.
 */
export const UpdateService = {
  /**
   * Checks if a new version is available in Firestore.
   * @param {boolean} showAlways - If true, shows an alert even if up to date.
   */
  checkUpdate: async (showAlways = false) => {
    // Solo verificar en plataformas nativas
    if (Platform.OS === 'web') return false;

    try {
      const docRef = doc(db, APP_CONFIG_COLLECTION, VERSION_CONTROL_DOC);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.warn('[UpdateService] Documento version_control no encontrado en Firestore.');
        return false;
      }

      const data = docSnap.data();
      const latestVersion = data?.latest_version;
      const currentVersion =
        Constants.expoConfig?.version ||
        Constants.manifest?.version ||
        '1.0.0';
      const forceUpdate = data?.force_update || false;

      const hasUpdate = latestVersion && UpdateService.isNewerVersion(latestVersion, currentVersion);

      if (!hasUpdate) {
        // La app local es igual o más nueva — no es un error, solo loguear si se pidió explícitamente
        if (showAlways) {
          Alert.alert('App al día ✅', `Ya tienes la última versión instalada (v${currentVersion}).`);
        }
        return false;
      }

      console.log(`[UpdateService] 🚀 Actualización disponible: v${currentVersion} → v${latestVersion}`);

      // Notificación local
      try {
        await NotificationService.sendLocalNotification(
          '🚀 Actualización disponible',
          `La versión ${latestVersion} de DSicario ya está lista para descargar.`
        );
      } catch (e) {
        console.warn('[UpdateService] No se pudo enviar notificación de actualización:', e);
      }

      // Botones del alert
      const buttons = [
        {
          text: 'Actualizar Ahora',
          onPress: () => {
            if (data.download_url) {
              Linking.openURL(data.download_url);
            } else {
              Alert.alert('Error', 'No se encontró el enlace de descarga.');
            }
          },
          style: 'default',
        },
      ];

      if (!forceUpdate) {
        buttons.unshift({ text: 'Más tarde', style: 'cancel' });
      }

      Alert.alert(
        forceUpdate ? '¡Actualización Obligatoria!' : '¡Nueva Versión Disponible!',
        `Hay una nueva versión (${latestVersion}) disponible.\n\n${data.release_notes || 'Mejoras de rendimiento y correcciones.'}`,
        buttons,
        { cancelable: !forceUpdate }
      );

      return true;
    } catch (error) {
      console.error('[UpdateService] Error verificando actualización:', error);
      if (error.code === 'permission-denied') {
        console.error('[UpdateService] Sin permisos: verifica las reglas de Firestore para /app_config/version_control');
      }
      return false;
    }
  },

  /**
   * Compara dos versiones semánticas.
   * @returns {boolean} true si v1 > v2
   */
  isNewerVersion: (v1, v2) => {
    if (!v1 || !v2) return false;
    const parse = (v) => String(v).split('.').map((n) => parseInt(n, 10) || 0);
    const a = parse(v1);
    const b = parse(v2);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] || 0) > (b[i] || 0)) return true;
      if ((a[i] || 0) < (b[i] || 0)) return false;
    }
    return false;
  },
};

export default UpdateService;
