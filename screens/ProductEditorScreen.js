import { showAlert } from '../utils/showAlert';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CustomHeader } from '../components/CustomHeader';
import { updateProduct, formatPrice, uploadProductImage, fetchAlmacen, fetchRecetas, saveRecipeIngredient, deleteRecipeIngredient, deleteProduct } from '../utils/api';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { useProducts } from '../contexts/AppContext';
import { useUser } from '../contexts/UserContext';

const ProductEditorScreen = ({ navigation, route }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { refetchProducts, updateProductLocally } = useProducts();
  const { user } = useUser();
  const { product, isSuggestionFlow } = route.params || {};
  const isEditing = !!product && !isSuggestionFlow;

  // Resolver ID de forma robusta desde el objeto crudo de la hoja
  const resolveField = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    }
    return undefined;
  };

  const [formData, setFormData] = useState(() => {
    const resolved = {
      id: resolveField(product, 'id', 'ID_Producto', 'id_producto', 'ID') || '',
      nombre: resolveField(product, 'nombre', 'Nombre', 'name', 'Name') || '',
      descripcion: resolveField(product, 'descripcion', 'Descripcion', 'description', 'Description') || '',
      precio: resolveField(product, 'precio', 'Precio', 'price', 'Price')?.toString() || '',
      descuento: resolveField(product, 'descuento', 'Descuento', 'discount', 'Discount')?.toString() || '0',
      categoria: resolveField(product, 'categoria', 'Categoria', 'category', 'Category') || '',
      subcategoria: resolveField(product, 'subcategoria', 'Subcategoria', 'subcategory', 'Subcategory') || '',
      imagen: resolveField(product, 'imagen', 'Imagen', 'image', 'Image') || '',
      agotado: !!(resolveField(product, 'agotado', 'Agotado', 'out_of_stock')),
      enOferta: !!(resolveField(product, 'enOferta', 'EnOferta', 'en_oferta')),
      recomendado: !!(resolveField(product, 'recomendado', 'Recomendado')),
      masVendido: !!(resolveField(product, 'masVendido', 'MasVendido', 'mas_vendido')),
      isPreOrder: !!(resolveField(product, 'isPreOrder', 'pre_orden?', 'tipo_orden')),
      isSuggestion: !!(resolveField(product, 'isSuggestion', 'recomendado')),
      suggestedBy: resolveField(product, 'suggestedBy', 'Sugerido_por') || user?.nombre || 'Usuario',
    };

    console.log('═══════════════════════════════════════════');
    console.log('📋 [EDITOR DIAGNÓSTICO] Abriendo editor de producto');
    console.log('📌 Modo:', isEditing ? 'EDITAR' : 'CREAR NUEVO');
    console.log('📦 Objeto RAW recibido (product):', JSON.stringify(product, null, 2));
    console.log('✅ Datos resueltos para el formulario:', JSON.stringify(resolved, null, 2));
    console.log('🖼️  URL de imagen:', resolved.imagen || '(Sin imagen)');
    console.log('🆔 ID resuelto:', resolved.id || '(Sin ID - producto nuevo)');
    console.log('═══════════════════════════════════════════');

    return resolved;
  });

  const [isLoading, setIsLoading] = useState(false);

  // --- RECIPE EDITOR STATE ---
  const [isRecipeModalVisible, setIsRecipeModalVisible] = useState(false);
  const [recipeIngredients, setRecipeIngredients] = useState([]);
  const [almacenItems, setAlmacenItems] = useState([]);
  const [searchAlmacen, setSearchAlmacen] = useState('');
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [hasUnsavedRecipeChanges, setHasUnsavedRecipeChanges] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert('Permiso denegado: Necesitamos acceso a tu galería para subir fotos.');
      } else {
        showAlert('Permiso denegado', 'Necesitamos acceso a tu galería para subir fotos.');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      handleInputChange('imagen', base64Img);
    }
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.precio || !formData.categoria) {
      showAlert('Campos requeridos', 'Por favor completa al menos el nombre, precio y categoría.');
      return;
    }

    setIsLoading(true);
    try {
      let finalImageUrl = formData.imagen;

      // Si la imagen es un base64 (nueva imagen elegida), subir a Firebase
      if (formData.imagen && formData.imagen.startsWith('data:')) {
        const productId = formData.id || `PROD_${Date.now()}`;
        const uploadedUrl = await uploadProductImage(formData.imagen, productId);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          // 🚨 DETENER: Si fallaron tanto Google Drive como Firebase Storage, no podemos guardar el base64 crudo en Sheets
          setIsLoading(false);
          if (Platform.OS === 'web') {
            window.alert('Error: No se pudo subir la imagen al servidor. Intenta con una URL directa o revisa tu conexión.');
          } else {
            showAlert('Error', 'No se pudo subir la imagen al servidor. Intenta con una URL directa.');
          }
          return; // Salir sin guardar para no corromper la base de datos
        }
      }

      const dataToSave = {
        ...formData,
        imagen: finalImageUrl,
        precio: parseFloat(formData.precio),
        descuento: parseFloat(formData.descuento),
      };

      const result = await updateProduct(dataToSave);
      console.log('📦 [API RESPONSE] Result:', result);
      
      if (result.success || result.status === 'success') {
        const msg = `Producto ${isEditing ? 'actualizado' : 'creado'} correctamente.`;
        
        // 🚀 ACTUALIZACIÓN INMEDIATA EN LOCAL
        updateProductLocally(dataToSave);

        if (Platform.OS === 'web') {
          window.alert('¡Éxito! ' + msg);
        } else {
          showAlert('¡Éxito!', msg);
        }
        
        // Sincronización en segundo plano (forzada)
        await refetchProducts(true);
        navigation.goBack();
      } else {
        console.error('❌ [API ERROR] Payload rejected:', result);
        throw new Error(result.error || result.message || 'Error desconocido del servidor');
      }
    } catch (error) {
      console.error('💥 [CRITICAL ERROR] handleSave failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        raw: error
      });
      if (Platform.OS === 'web') {
        window.alert('Error: No se pudo guardar el producto. Verifica tu conexión.');
      } else {
        showAlert('Error', 'No se pudo guardar el producto. Verifica tu conexión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = () => new Promise((resolve) => {
      if (Platform.OS === 'web') {
        resolve(window.confirm(`¿Estás seguro de que quieres ELIMINAR "${formData.nombre}"? Esta acción no se puede deshacer.`));
      } else {
        showAlert(
          '⚠️ Eliminar Producto',
          `¿Estás seguro de que quieres eliminar "${formData.nombre}"? Esta acción no se puede deshacer.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'ELIMINAR', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      }
    });

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await deleteProduct(formData.id);
      if (result?.success) {
        // Actualizar caché local eliminando el producto del estado
        refetchProducts(true);
        navigation.goBack();
        console.log(`✅ Producto "${formData.nombre}" eliminado correctamente.`);
      } else {
        if (Platform.OS === 'web') {
          window.alert('No se pudo eliminar el producto. Inténtalo de nuevo.');
        } else {
          showAlert('Error', 'No se pudo eliminar el producto. Inténtalo de nuevo.');
        }
      }
    } catch (err) {
      console.error('Error al eliminar producto:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = () => {
    const title = 'Descartar cambios';
    const message = '¿Estás seguro de que quieres salir sin guardar los cambios?';

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        navigation.goBack();
      }
    } else {
      showAlert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, descartar', style: 'destructive', onPress: () => navigation.goBack() }
      ]);
    }
  };

  // --- RECIPE EDITOR FUNCTIONS ---
  const handleOpenRecipeEditor = async () => {
    if (!formData.id) {
      showAlert('Atención', 'Debes guardar el producto primero antes de editar su receta.');
      return;
    }
    setIsRecipeModalVisible(true);
    setIsLoadingRecipe(true);
    try {
      const prodId = formData.id;
      const [almacen, recetas] = await Promise.all([
        fetchAlmacen(),
        fetchRecetas()
      ]);
      
      setAlmacenItems(almacen || []);
      const currentRecipe = (recetas || [])
        .filter(r => 
          (r.idProducto && String(r.idProducto) === String(prodId)) || 
          (r['productos terminados'] && String(r['productos terminados']).trim().toLowerCase() === String(formData.nombre).trim().toLowerCase())
        )
        .map(r => ({
          id: r.IDrecetas || r.id,
          IDrecetas: r.IDrecetas || r.id,
          idProducto: formData.id,
          productName: r['productos terminados'] || formData.nombre,
          ingredientName: r.ingrediente || r.ingredientName,
          quantity: String(r['cant. pocion'] || r.quantity || '1'),
          unit: r['tipo de porcion'] || r.unit || 'und'
        }));
      setRecipeIngredients(currentRecipe);
    } catch (err) {
      console.error('Error loading recipe data:', err);
      showAlert('Error', 'No se pudieron cargar los datos de la receta');
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleCloseRecipeModal = () => {
    if (hasUnsavedRecipeChanges) {
      if (Platform.OS === 'web') {
        if (window.confirm('¿Deseas cerrar sin guardar los cambios en la receta?')) {
          setIsRecipeModalVisible(false);
          setHasUnsavedRecipeChanges(false);
        }
      } else {
        Alert.alert(
          'Cambios sin guardar',
          '¿Deseas cerrar sin guardar los cambios en la receta?',
          [
            { text: 'No, seguir editando', style: 'cancel' },
            { text: 'Sí, cerrar', style: 'destructive', onPress: () => {
              setIsRecipeModalVisible(false);
              setHasUnsavedRecipeChanges(false);
            }}
          ]
        );
      }
    } else {
      setIsRecipeModalVisible(false);
    }
  };

  const handleAddIngredientToRecipe = (item) => {
    const exists = recipeIngredients.find(ing => ing.ingredientName === item.nombre);
    if (exists) {
      showAlert('Aviso', 'Este ingrediente ya está en la receta');
      return;
    }

    const newIngredient = {
      idProducto: formData.id,
      productName: formData.nombre,
      ingredientName: item.nombre,
      quantity: '1',
      unit: item.tipoPorcion || item.tipoMedida || 'und'
    };

    setRecipeIngredients([...recipeIngredients, newIngredient]);
    setHasUnsavedRecipeChanges(true);
  };

  const handleRemoveIngredientFromRecipe = async (index) => {
    const ingredient = recipeIngredients[index];
    const targetId = ingredient.id || ingredient.IDrecetas;
    if (targetId) { // Si tiene ID, ya estaba guardado en Sheets
      const doDelete = async () => {
        try {
          await deleteRecipeIngredient(targetId);
          const newList = [...recipeIngredients];
          newList.splice(index, 1);
          setRecipeIngredients(newList);
        } catch (err) {
          showAlert('Error', 'No se pudo eliminar el ingrediente');
        }
      };

      if (Platform.OS === 'web') {
        if (window.confirm('¿Deseas eliminar este ingrediente de la receta permanentemente?')) {
          doDelete();
        }
      } else {
        Alert.alert(
          'Eliminar ingrediente',
          '¿Deseas eliminar este ingrediente de la receta permanentemente?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: doDelete }
          ]
        );
      }
    } else {
      const newList = [...recipeIngredients];
      newList.splice(index, 1);
      setRecipeIngredients(newList);
      setHasUnsavedRecipeChanges(true);
    }
  };

  const handleToggleUnit = (idx) => {
    const units = ['und', 'gr', 'ml', 'oz', 'lb', 'kg'];
    const newList = [...recipeIngredients];
    const currentUnit = newList[idx].unit || 'und';
    const nextIdx = (units.indexOf(currentUnit) + 1) % units.length;
    newList[idx].unit = units[nextIdx];
    setRecipeIngredients(newList);
    setHasUnsavedRecipeChanges(true);
  };

  const handleSaveRecipe = async () => {
    setIsSavingRecipe(true);
    try {
      // Guardar todos los ingredientes (nuevos y actualizados)
      for (const ing of recipeIngredients) {
        await saveRecipeIngredient(ing);
      }
      setHasUnsavedRecipeChanges(false);
      showAlert('Éxito', 'Receta guardada correctamente');
      handleOpenRecipeEditor(); // Recargar para obtener IDs de nuevos ingredientes
    } catch (err) {
      console.error('Error saving recipe:', err);
      showAlert('Error', 'No se pudo guardar la receta');
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, paddingBottom: 100 },
    fieldGroup: { marginBottom: spacing.lg },
    label: { 
      fontSize: 14, 
      fontWeight: 'bold', 
      color: colors.text.secondary, 
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: borders.radius.md,
      padding: 15,
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 16,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    flex1: { flex: 1 },
    imagePreviewContainer: {
      width: '100%',
      height: 200,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageActions: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    imageActionBtn: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    imageActionText: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 13,
    },
    urlInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.05)',
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 45,
    },
    urlIcon: {
      marginRight: 8,
    },
    urlInput: {
      flex: 1,
      fontSize: 13,
      color: colors.text.primary,
    },
    saveBtn: {
      flex: 2,
      backgroundColor: colors.primary,
      padding: 18,
      borderRadius: 100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      ...shadows.large,
    },
    discardBtn: {
      flex: 1,
      backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      padding: 18,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    footerButtons: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: 'transparent',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    discardBtnText: { color: colors.text.secondary, fontSize: 14, fontWeight: '600' },
    deleteBtn: {
      flex: 1,
      backgroundColor: '#DC2626',
      padding: 18,
      borderRadius: 100,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    deleteBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    switchGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    switchLabel: { fontSize: 16, color: colors.text.primary, fontWeight: '600' },
    fabRecipe: {
      position: 'absolute',
      bottom: 90,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      zIndex: 10,
    },
  }), [colors, darkMode]);

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader 
        title={isSuggestionFlow ? 'Sugerir Producto' : (isEditing ? 'Editar Producto' : 'Nuevo Producto')} 
        showBack 
      />
      
      <ScrollView contentContainerStyle={styles.content}>


        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Imagen del Producto</Text>
          
          <View style={styles.imagePreviewContainer}>
            {formData.imagen ? (
              <Image source={{ uri: formData.imagen }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <FontAwesome5 name="image" size={40} color={colors.text.disabled} />
                <Text style={{ color: colors.text.disabled, marginTop: 10 }}>Sin Imagen</Text>
              </View>
            )}
          </View>

          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.imageActionBtn} onPress={pickImage}>
              <FontAwesome5 name="camera" size={16} color="#FFF" />
              <Text style={styles.imageActionText}>Elegir Foto</Text>
            </TouchableOpacity>
            
            <View style={styles.urlInputContainer}>
              <FontAwesome5 name="link" size={14} color={colors.text.secondary} style={styles.urlIcon} />
              <TextInput
                style={styles.urlInput}
                placeholder="Pegar URL de imagen..."
                placeholderTextColor={colors.text.disabled}
                value={formData.imagen?.startsWith('data:') ? 'Imagen cargada' : formData.imagen}
                onChangeText={(val) => handleInputChange('imagen', val)}
              />
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre del Producto *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Burguer Sicaria"
            placeholderTextColor={colors.text.disabled}
            value={formData.nombre}
            onChangeText={(val) => handleInputChange('nombre', val)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe los ingredientes o detalles..."
            placeholderTextColor={colors.text.disabled}
            value={formData.descripcion}
            onChangeText={(val) => handleInputChange('descripcion', val)}
            multiline
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>{isSuggestionFlow ? 'Precio Estimado' : 'Precio *'}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.text.disabled}
              value={formData.precio}
              onChangeText={(val) => handleInputChange('precio', val)}
              keyboardType="numeric"
            />
          </View>
          {!isSuggestionFlow && (
            <View style={[styles.fieldGroup, styles.flex1]}>
              <Text style={styles.label}>Descuento (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.text.disabled}
                value={formData.descuento}
                onChangeText={(val) => handleInputChange('descuento', val)}
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Categoría *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Hamburguesas"
              placeholderTextColor={colors.text.disabled}
              value={formData.categoria}
              onChangeText={(val) => handleInputChange('categoria', val)}
            />
          </View>
          <View style={[styles.fieldGroup, styles.flex1]}>
            <Text style={styles.label}>Subcategoría</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Premium"
              placeholderTextColor={colors.text.disabled}
              value={formData.subcategoria}
              onChangeText={(val) => handleInputChange('subcategoria', val)}
            />
          </View>
        </View>




        {!isSuggestionFlow && (
          <View style={[styles.fieldGroup, { marginTop: 10 }]}>
            <Text style={styles.label}>Configuración de Visibilidad</Text>
            <View style={{ padding: 10, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <View style={styles.switchGroup}>
                <Text style={styles.switchLabel}>Solo Pre-orden</Text>
                <Switch
                  value={formData.isPreOrder}
                  onValueChange={(val) => handleInputChange('isPreOrder', val)}
                  trackColor={{ false: '#767577', true: colors.primary + '80' }}
                  thumbColor={formData.isPreOrder ? colors.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchGroup}>
                <Text style={styles.switchLabel}>Sugerencia</Text>
                <Switch
                  value={formData.isSuggestion}
                  onValueChange={(val) => handleInputChange('isSuggestion', val)}
                  trackColor={{ false: '#767577', true: colors.primary + '80' }}
                  thumbColor={formData.isSuggestion ? colors.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchGroup}>
                <Text style={styles.switchLabel}>Agotado</Text>
                <Switch 
                  value={formData.agotado} 
                  onValueChange={(val) => handleInputChange('agotado', val)}
                  trackColor={{ false: '#767577', true: colors.error + '80' }}
                  thumbColor={formData.agotado ? colors.error : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchGroup}>
                <Text style={styles.switchLabel}>En Oferta</Text>
                <Switch 
                  value={formData.enOferta} 
                  onValueChange={(val) => handleInputChange('enOferta', val)}
                  trackColor={{ false: '#767577', true: colors.success + '80' }}
                  thumbColor={formData.enOferta ? colors.success : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchGroup}>
                <Text style={styles.switchLabel}>Recomendado</Text>
                <Switch 
                  value={formData.recomendado} 
                  onValueChange={(val) => handleInputChange('recomendado', val)}
                  trackColor={{ false: '#767577', true: colors.primary + '80' }}
                  thumbColor={formData.recomendado ? colors.primary : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.switchGroup}>
                <Text style={styles.switchLabel}>Más Vendido</Text>
                <Switch 
                  value={formData.masVendido} 
                  onValueChange={(val) => handleInputChange('masVendido', val)}
                  trackColor={{ false: '#767577', true: colors.accent + '80' }}
                  thumbColor={formData.masVendido ? colors.accent : '#f4f3f4'}
                />
              </View>

              <View style={[styles.switchGroup, { borderBottomWidth: 0 }]}>
                <Text style={styles.switchLabel}>Especial de la Casa</Text>
                <Switch 
                  value={formData.delaCasa} 
                  onValueChange={(val) => handleInputChange('delaCasa', val)}
                  trackColor={{ false: '#767577', true: '#E63946' + '80' }}
                  thumbColor={formData.delaCasa ? '#E63946' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {isEditing && !isSuggestionFlow && (
        <TouchableOpacity 
          style={styles.fabRecipe} 
          onPress={handleOpenRecipeEditor}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="book-open" size={20} color="#FFF" />
        </TouchableOpacity>
      )}

      <View style={styles.footerButtons}>
        <TouchableOpacity 
          style={styles.discardBtn} 
          onPress={handleDiscard}
          disabled={isLoading}
        >
          <Text style={styles.discardBtnText}>DESCARTAR</Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={isLoading}
          >
            <FontAwesome5 name="trash" size={16} color="#FFF" />
            <Text style={styles.deleteBtnText}>BORRAR</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <FontAwesome5 name={isSuggestionFlow ? "paper-plane" : "save"} size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>
                {isSuggestionFlow ? 'ENVIAR' : (isEditing ? 'GUARDAR' : 'CREAR')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 📖 MODAL: EDITOR DE RECETAS */}
      <Modal
        visible={isRecipeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseRecipeModal}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 15, maxHeight: '90%', overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 15 }}>
              <View>
                <Text style={{ ...typography.h3, color: colors.text.primary }}>Receta: {formData.nombre}</Text>
                <Text style={{ color: colors.text.secondary, fontSize: 12 }}>Define los ingredientes de este producto</Text>
              </View>
              <TouchableOpacity onPress={handleCloseRecipeModal}>
                <FontAwesome5 name="times" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {/* Ingredientes Actuales */}
              <Text style={{ fontWeight: 'bold', color: colors.primary, marginBottom: 10 }}>Ingredientes en Receta</Text>
              
              {isLoadingRecipe ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Cargando receta...</Text>
                </View>
              ) : recipeIngredients.length === 0 ? (
                <Text style={{ color: colors.text.secondary, textAlign: 'center', marginVertical: 10 }}>No hay ingredientes definidos</Text>
              ) : (
                recipeIngredients.map((ing, idx) => (
                  <View key={idx} style={{ flexDirection: 'column', backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                    {/* Fila 1: Nombre y Basurero */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ flex: 1, color: colors.text.primary, fontWeight: 'bold', fontSize: 16 }}>{ing.ingredientName}</Text>
                      <TouchableOpacity onPress={() => handleRemoveIngredientFromRecipe(idx)} style={{ padding: 5, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 5 }}>
                        <FontAwesome5 name="trash-alt" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Fila 2: Stepper de Cantidad y Ciclo de Unidad */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      
                      {/* Stepper (- input +) */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                        <TouchableOpacity 
                          style={{ padding: 12, borderRightWidth: 1, borderRightColor: colors.border }}
                          onPress={() => {
                            const newList = [...recipeIngredients];
                            const val = parseFloat(newList[idx].quantity) || 0;
                            newList[idx].quantity = String(Math.max(0, val - 0.5));
                            setRecipeIngredients(newList);
                            setHasUnsavedRecipeChanges(true);
                          }}
                        >
                          <FontAwesome5 name="minus" size={12} color={colors.text.secondary} />
                        </TouchableOpacity>
                        
                        <TextInput
                          style={{ color: colors.text.primary, padding: 8, width: 55, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}
                          value={String(ing.quantity)}
                          keyboardType="numeric"
                          onChangeText={(text) => {
                            const newList = [...recipeIngredients];
                            newList[idx].quantity = text.replace(/[^0-9.]/g, '');
                            setRecipeIngredients(newList);
                            setHasUnsavedRecipeChanges(true);
                          }}
                        />
                        
                        <TouchableOpacity 
                          style={{ padding: 12, borderLeftWidth: 1, borderLeftColor: colors.border }}
                          onPress={() => {
                            const newList = [...recipeIngredients];
                            const val = parseFloat(newList[idx].quantity) || 0;
                            newList[idx].quantity = String(val + 0.5);
                            setRecipeIngredients(newList);
                            setHasUnsavedRecipeChanges(true);
                          }}
                        >
                          <FontAwesome5 name="plus" size={12} color={colors.text.secondary} />
                        </TouchableOpacity>
                      </View>

                      {/* Unidad Ciclable */}
                      <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={() => handleToggleUnit(idx)}
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          backgroundColor: colors.primary + '20', 
                          paddingVertical: 10, 
                          paddingHorizontal: 15, 
                          borderRadius: 8, 
                          minWidth: 85, 
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: colors.primary + '30'
                        }}
                      >
                        <Text style={{ color: colors.primary, fontWeight: 'bold', marginRight: 5 }}>
                          {ing.unit}
                        </Text>
                        <FontAwesome5 name="sync-alt" size={10} color={colors.primary} />
                      </TouchableOpacity>
                      
                    </View>
                  </View>
                ))
              )}

              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20 }} />

              {/* Buscador de Almacén */}
              <Text style={{ fontWeight: 'bold', color: colors.primary, marginBottom: 10 }}>Añadir del Almacén</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 10, borderRadius: 8, marginBottom: 10 }}>
                <FontAwesome5 name="search" size={14} color={colors.text.secondary} style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="Buscar insumo..."
                  placeholderTextColor={colors.text.secondary}
                  style={{ color: colors.text.primary, flex: 1 }}
                  value={searchAlmacen}
                  onChangeText={setSearchAlmacen}
                />
              </View>

              <View>
                {almacenItems
                  .filter(item => item.nombre && item.nombre.toLowerCase().includes(searchAlmacen.toLowerCase()))
                  .map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                      onPress={() => handleAddIngredientToRecipe(item)}
                    >
                      <Text style={{ color: colors.text.primary }}>{item.nombre} ({item.tipoPorcion || item.tipoMedida || 'und'})</Text>
                      <FontAwesome5 name="plus-circle" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>

            <View style={{ padding: 20, paddingTop: 10 }}>
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' }}
                onPress={handleSaveRecipe}
                disabled={isSavingRecipe}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Guardar Receta Completa</Text>
              </TouchableOpacity>
            </View>

            {/* Overlay de Carga Guardando Receta */}
            {isSavingRecipe && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
                <View style={{ backgroundColor: colors.surface, padding: 30, borderRadius: 15, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ color: colors.text.primary, marginTop: 15, fontWeight: 'bold', fontSize: 16 }}>Guardando receta...</Text>
                  <Text style={{ color: colors.text.secondary, fontSize: 13, marginTop: 5 }}>Sincronizando con Sheets</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProductEditorScreen;
