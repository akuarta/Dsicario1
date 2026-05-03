import { Alert } from 'react-native';

/**
 * Muestra una alerta compatible con web y móvil.
 * @param {string} title - Título de la alerta.
 * @param {string} message - Mensaje de la alerta.
 * @param {Array} [buttons] - Opcional. Botones para Alert.alert en móvil.
 */
export function showAlert(title, message, buttons) {
  if (typeof window !== 'undefined' && window.alert) {
    if (buttons && buttons.length > 0) {
      // 🕵️ Lógica inteligente para Web:
      // Buscamos el botón que NO es "cancel" para la confirmación.
      // Si hay varios, el último suele ser la acción principal (ej: Borrar, Cobrar).
      const actionButtons = buttons.filter(b => b.style !== 'cancel');
      const confirmButton = actionButtons[actionButtons.length - 1]; // El botón de acción principal
      const cancelButton = buttons.find(b => b.style === 'cancel');

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
      window.alert(`${title}\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
}
