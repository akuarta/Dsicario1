# Naming Consistency Skill

Enforces consistent naming across the app - button labels, screen titles, navigation names, and section headers must match.

## Rules

### 1. Button → Screen Title Match
When a button navigates to a screen, the button label MUST match the screen's header title.

| Button Label | Screen Header |
|---|---|
| Gestión de Usuarios | Gestión de Usuarios |
| Rendimiento Cocineros | Cocineros |
| Rendimiento Meseros | Meseros |
| Administrar Repartidores | Administrar Repartidores |
| Costos de Envío | Costos de Envío |
| Tasas de Cambio | Tasas de Cambio |
| Métodos de Pago | Métodos de Pago |
| Panel de Gestión | Panel de Gestión |

### 2. Navigation Name Consistency
Navigation route names in `navigate()` calls MUST match screen names in Stack/Tab navigators.

### 3. Section Headers in Lists
Section titles in settings screens must be clear and descriptive:
- "Administración" for admin-only sections
- "Gestión de Negocio" for business operations
- "Ajustes de App" for user preferences

### 4. Role Names
Role names must be consistent everywhere:
- "Cocina" or "Cocinero" (not both)
- "Mesero" (not "Meseros" in role fields)
- "Delivery" or "Repartidor" (not both)

### 5. No Duplicate Navigation
If a screen is accessible from multiple places, ensure:
- Same button label in all locations
- Same icon in all locations
- Same behavior

## File Locations
- `screens/GestionScreen.js` - Main management panel
- `screens/AdminStaffScreen.js` - User CRUD
- `screens/AdminKitchenScreen.js` - Cook performance
- `screens/AdminWaiterScreen.js` - Waiter performance
- `navigation/GestionStack.js` - Screen registrations
- `components/ProfileDrawerContent.js` - Drawer menu items

## Common Mistakes to Avoid
1. ❌ Button says "Gestión de Personal" but screen says "Gestión de Usuarios"
2. ❌ Button says "Cocineros" but screen shows performance stats
3. ❌ Button says "Rendimiento" but screen is for CRUD operations
4. ❌ Navigation name doesn't match Stack.Screen name
5. ❌ Same screen accessible with different labels from different places
