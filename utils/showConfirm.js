import { Alert } from 'react-native';

/**
 * Muestra una confirmación compatible con web y móvil.
 * @param {string} title - Título de la confirmación.
 * @param {string} message - Mensaje de la confirmación.
 * @param {function} onConfirm - Acción a ejecutar si el usuario confirma.
 */
export function showConfirm(title, message, onConfirm) {
  if (typeof window !== 'undefined' && window.confirm) {
    const confirmed = window.confirm(`${title}\n${message}`);
    if (confirmed) onConfirm();
  } else {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: onConfirm }
      ]
    );
  }
}
