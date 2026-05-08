import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
  Platform
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CustomHeader } from '../components/CustomHeader';
import { updateProduct, formatPrice, uploadProductImage } from '../utils/api';
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

  const [formData, setFormData] = useState({
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
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert('Permiso denegado: Necesitamos acceso a tu galería para subir fotos.');
      } else {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para subir fotos.');
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
      Alert.alert('Campos requeridos', 'Por favor completa al menos el nombre, precio y categoría.');
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
          Alert.alert('¡Éxito!', msg);
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
        Alert.alert('Error', 'No se pudo guardar el producto. Verifica tu conexión.');
      }
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
      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, descartar', style: 'destructive', onPress: () => navigation.goBack() }
      ]);
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
    switchGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    switchLabel: { fontSize: 16, color: colors.text.primary, fontWeight: '600' },
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

      <View style={styles.footerButtons}>
        <TouchableOpacity 
          style={styles.discardBtn} 
          onPress={handleDiscard}
          disabled={isLoading}
        >
          <Text style={styles.discardBtnText}>DESCARTAR</Text>
        </TouchableOpacity>

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
    </SafeAreaView>
  );
};

export default ProductEditorScreen;
