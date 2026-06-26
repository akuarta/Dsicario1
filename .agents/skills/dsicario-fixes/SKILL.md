---
name: dsicario-fixes
description: Corecciónes específicas del proyecto DSicario - Scroll web, botones flotantes, mapa con GPS, facturas, navegación. Usar cuando se hagan cambios en estos archivos.
---

# DSicario Fixes - Guía de Correcciones

## 1. SCROLL EN WEB (React Native Web)

### Problema
El scroll no funciona en web cuando el tab bar es flotante (`position: 'absolute'`).

### Causa
En React Native Web, los contenedores con `position: 'absolute'` pierden la referencia de altura y se expanden infinitamente, eliminando el scroll.

### Solución

#### En `web/index.html`:
```css
html, body, #root {
  height: 100%;
  width: 100%;
  background-color: #1a1a1a;
  overflow: auto;  /* ← CRÍTICO: NO usar hidden */
}
```

#### En `styles/globalStyles.js`:
```javascript
import { StyleSheet, Platform } from 'react-native';

container: {
  flex: 1,
  backgroundColor: colors.background,
  ...Platform.select({
    web: {
      overflow: 'auto',
    },
    default: {},
  }),
},
```

#### En `navigation/AppNavigator.js` - Tab Navigator:
```javascript
screenOptions={{
  headerShown: false,
  tabBarStyle: { position: 'absolute' },
  sceneStyle: Platform.select({
    web: {
      flex: 1,
      overflow: 'auto',
    },
    default: {},
  }),
}}
```

#### En ScrollView:
```javascript
<ScrollView 
  style={{ flex: 1 }} 
  contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
>
```

### Reglas
- NUNCA usar `overflow: hidden` en `html, body, #root`
- SIEMPRE usar `flexGrow: 1` en `contentContainerStyle` del ScrollView
- En web, usar `overflow: 'auto'` en contenedores principales

---

## 2. BOTONES FLOTANTES

### Problema
Los botones de acción se pierden al hacer scroll.

### Solución
Aplicar `position: 'absolute'` con `bottom: 0` y `zIndex: 100`.

#### En `screens/ProductDetailScreen.js` - Botón "Agregar al carrito":
```javascript
fixedFooter: { 
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: colors.surface, 
  paddingHorizontal: spacing.md, 
  paddingTop: spacing.sm, 
  paddingBottom: spacing.lg, 
  borderTopWidth: 1, 
  borderTopColor: colors.border,
  elevation: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -5 },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  zIndex: 100,
},
```

#### En `screens/CartScreen.js` - Botón "Continuar":
```javascript
footer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: colors.surface,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  elevation: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -5 },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  zIndex: 100,
},
```

#### En `screens/CheckoutScreen.js` - Botón "Confirmar":
```javascript
footer: { 
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: spacing.md, 
  backgroundColor: colors.surface, 
  borderTopWidth: 1, 
  borderTopColor: colors.border,
  elevation: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -5 },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  zIndex: 100,
},
```

### Aumentar paddingBottom en listas
```javascript
listContainer: {
  paddingVertical: spacing.sm,
  paddingBottom: 150,  // ← Aumentar para botón flotante
},
```

---

## 3. MAPA CON GPS PARA PICKUP/LOCAL

### Problema
El mapa no muestra la ruta real cuando el cliente va a retirar al local.

### Solución
Usar la ubicación del GPS del dispositivo en vez de la ubicación guardada.

#### En `screens/DeliveryTrackingScreen.js`:

**1. Importar Location (solo native):**
```javascript
import { Platform } from 'react-native';

let Location = null;
if (Platform.OS !== 'web') {
  try {
    Location = require('expo-location');
  } catch (e) {
    console.warn('expo-location not available:', e);
  }
}
```

**2. Agregar estado:**
```javascript
const [deviceLocation, setDeviceLocation] = useState(null);
```

**3. Obtener ubicación del dispositivo:**
```javascript
useEffect(() => {
  const getDeviceLocation = async () => {
    if (isDelivery) return; // Solo para pickup/local
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setDeviceLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting device location:', error);
    }
  };
  
  getDeviceLocation();
}, [isDelivery]);
```

**4. Usar deviceLocation en clientLocation:**
```javascript
const clientLocation = useMemo(() => {
  // Para pedidos pickup/local, usar ubicación del dispositivo
  if (!isDelivery && deviceLocation) {
    return deviceLocation;
  }
  
  let loc = orderDetails?.location || { 
    latitude: route.params?.lat || CONFIG.STORE_LOCATION.latitude, 
    longitude: route.params?.lng || CONFIG.STORE_LOCATION.longitude 
  };
  // ... resto de la lógica
}, [orderDetails, route.params, isDelivery, deviceLocation]);
```

**5. Usar en DeliveryMap:**
```javascript
<DeliveryMap 
  origin={CONFIG.STORE_LOCATION}
  destination={(!isDelivery && deviceLocation) ? deviceLocation : clientLocation}
  isPickup={!isDelivery}
/>
```

---

## 4. MODAL DE FACTURA

### Ubicación
`screens/DeliveryTrackingScreen.js`

### Datos disponibles en `orderDetails`:
```javascript
{
  id: 'DS-XXXX',
  estado: 'En proceso',
  hora: '2024-01-15 10:30',
  cliente: 'Juan Pérez',
  direccion: 'Calle Principal #123',
  tipo: 'delivery' | 'pickup' | 'local',
  total: 1500.00,
  items: [
    { nombre: 'Producto 1', cantidad: 2, precio: 500 },
    { nombre: 'Producto 2', cantidad: 1, precio: 500 },
  ]
}
```

---

## 5. NAVEGACIÓN

### Error común
```
The action 'NAVIGATE' with payload {"name":"Config"} was not handled by any navigator.
```

### Solución
La pantalla se llama `Configuracion`, no `Config`.

**En `screens/DeliveryTrackingScreen.js`:**
```javascript
// ❌ INCORRECTO
navigation.navigate('Config')

// ✅ CORRECTO
navigation.navigate('Configuracion')
```

### Pantallas disponibles en Tab Navigator:
- `InicioTab`
- `ExplorarTab`
- `PreOrdenTab`
- `PedidosTab`
- `Historial`
- `Configuracion`
- `DeliveryTracking`
- `CarritoTab`

---

## 6. PREVENCIÓN DE REGRESIONES

### Regla de Oro
Antes de hacer cambios en UI, preguntar:
1. ¿Este cambio afecta solo al componente actual?
2. ¿El scroll sigue funcionando en web?
3. ¿Los botones flotantes siguen visibles?
4. ¿El mapa muestra la ubicación correcta?

### Formato de cambios
Cuando se pida un cambio de UI:
1. Hacer solo el cambio específico
2. NO reescribir archivos completos
3. Preservar estilos existentes
4. Agregar `Platform.select()` para web

---

## Archivos críticos a revisar antes de hacer cambios:

| Archivo | Qué revisar |
|---------|-------------|
| `web/index.html` | `overflow: auto` en html/body/#root |
| `styles/globalStyles.js` | `Platform.select` con `overflow: 'auto'` |
| `navigation/AppNavigator.js` | `sceneStyle` para scroll, nombre de pantallas |
| `components/CustomTabBar.js` | `position: 'absolute'` |
| `screens/ProductDetailScreen.js` | Botón flotante con `zIndex: 100` |
| `screens/CartScreen.js` | Footer flotante con `paddingBottom: 150` |
| `screens/CheckoutScreen.js` | Footer flotante |
| `screens/DeliveryTrackingScreen.js` | GPS para pickup, modal factura |
