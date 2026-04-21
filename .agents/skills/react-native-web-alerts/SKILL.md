---
name: react-native-web-alerts
description: Guidelines for implementing alerts or confirmation dialogs in React Native apps that support the Web platform to prevent silent failures.
---

# Cross-Platform Alert Best Practices

When building React Native applications that support the Web (`react-native-web`), the native `Alert.alert` API may fail silently or behave unpredictably on browsers, especially when using complex configurations or more than two buttons. 

To ensure cross-platform stability, always use a platform-aware check to fallback to standard browser APIs (e.g. `window.confirm` or `window.alert`) when running on Web.

## Implementation Pattern

Always import `Platform` from `react-native` and branch the logic for alerts to wrap the execution block:

```javascript
import { Platform, Alert } from 'react-native';

const handleAction = async () => {
  const executeAction = async () => {
    // Perform the core action here
    console.log("Action confirmed!");
  };

  if (Platform.OS === 'web') {
    // Use native browser confirmation on Web
    if (window.confirm('¿Estás seguro de que deseas continuar?')) {
      executeAction();
    }
  } else {
    // Use RN Alert on iOS/Android
    Alert.alert('Confirmación', '¿Estás seguro de que deseas continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, continuar', onPress: executeAction }
    ]);
  }
};
```

If it's a simple informational alert with NO buttons, `window.alert` should be used on Web:

```javascript
  if (Platform.OS === 'web') {
    window.alert('Operación exitosa');
  } else {
    Alert.alert('Éxito', 'Operación exitosa');
  }
```

## Why this is necessary?
Browsers and React-Native-Web struggle to properly render `Alert.alert` natively in all circumstances. Sometimes, press events mapped to `Alert.alert` appear to "do absolutely nothing" because the underlying browser API call blocks the prompt silently. Using this pattern completely bypasses this limitation.
