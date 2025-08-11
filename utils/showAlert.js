import { Alert } from 'react-native';

/**
 * Muestra una alerta compatible con web y móvil.
 * @param {string} title - Título de la alerta.
 * @param {string} message - Mensaje de la alerta.
 * @param {Array} [buttons] - Opcional. Botones para Alert.alert en móvil.
 */
export function showAlert(title, message, buttons) {
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message, buttons);
  }
}
