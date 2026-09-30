# Google Apps Script Backend Manager Skill

Este Skill define las reglas y procedimientos para gestionar el backend basado en Google Apps Script (GAS) para la aplicación DSicario.

## 🏗️ Estructura del Backend
El backend reside en un archivo de Google Apps Script vinculado a un Google Sheet que actúa como base de datos NoSQL.

### Acciones Administrativas (Estructura)
- **`CREATE_SHEET`**: Crea una nueva pestaña. Requiere `sheet`.
- **`DELETE_SHEET`**: Elimina una pestaña. Requiere `sheet`.
- **`DELETE_COLUMN`**: Elimina una columna por nombre. Requiere `sheet` y `columnName`.
- **`LIST_SHEETS`**: Lista todas las pestañas disponibles.

### Acciones de Datos (Contenido)
- **`UPSERT` / `ADD`**: Agrega o actualiza registros. **IMPORTANTE**: Si una clave en el JSON no tiene columna, el servidor la creará automáticamente.
- **`UPDATE`**: Actualiza una fila existente buscando por `idField`.
- **`DELETE`**: Elimina una fila por ID.

## 📏 Reglas de Oro para Agentes
1. **Nomenclatura de Columnas**: Usar siempre `PascalCase` (ej: `ID_Pedido`, `Direccion`, `Whatsapp`). El servidor es tolerante a minúsculas en la búsqueda, pero escribe las cabeceras como se envían.
2. **Sincronización**: Al añadir nuevos campos en la App (ej: `CheckoutScreen`), asegurar que se envíen con la capitalización correcta para que el Excel se mantenga limpio.
3. **Validación de Usuarios**: La hoja `USUARIOS` es crítica. No se deben permitir inserciones sin `ID_User` y `NombreUser`.
4. **Robustez de Lectura**: Al leer datos de pedidos antiguos, usar la función `getRobustProp` en el frontend para manejar variaciones históricas de nombres (`Direccion` vs `Dirección`).

## 🚀 Cómo Actualizar el Servidor
Cualquier cambio en `backend/Code.gs` debe ser copiado manualmente por el usuario al Editor de Scripts de Google y desplegado como una "Nueva implementación" para generar una URL actualizada.
