import { Alert, Platform } from 'react-native';

/**
 * Muestra una alerta compatible con web y móvil.
 * @param {string} title - Título de la alerta.
 * @param {string} message - Mensaje de la alerta.
 * @param {Array} [buttons] - Opcional. Botones para Alert.alert en móvil.
 */
export function showAlert(title, message, buttons) {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      // 🕵️ Lógica inteligente para Web:
      // Buscamos el botón que NO es "cancel" para la confirmación.
      // Si hay varios, el último suele ser la acción principal (ej: Borrar, Cobrar).
      const actionButtons = buttons.filter(b => b.style !== 'cancel');
      const confirmButton = actionButtons[actionButtons.length - 1]; // El botón de acción principal
      const cancelButton = buttons.find(b => b.style === 'cancel');

      // En web usamos window.confirm o alert según corresponda
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm(`${title}\n${message}`)) {
          if (confirmButton && confirmButton.onPress) {
            console.log('✅ [showAlert] Ejecutando:', confirmButton.text);
            confirmButton.onPress();
          }
        } else {
          if (cancelButton && cancelButton.onPress) {
            cancelButton.onPress();
          }
        }
      } else {
        // Fallback si por alguna razón no hay window.confirm (raro en web)
        console.warn('window.confirm no disponible');
        if (confirmButton && confirmButton.onPress) confirmButton.onPress();
      }
    } else {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`${title}\n${message}`);
      }
    }
  } else {
    // En Nativo (Android/iOS) usamos Alert.alert siempre
    Alert.alert(title, message, buttons);
  }
}
