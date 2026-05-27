import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import GlassPanel from '../components/GlassPanel';
import { 
  fetchAlmacen, 
  updateAlmacenItem, 
  addAlmacenItem,
  fetchRecetas,
  formatPrice
} from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const EMPAQUE_OPTIONS = ['Caja', 'Saco', 'Bolsa', 'Paquete', 'Galón', 'Cubeta', 'Bandeja', 'Fardo', 'Otro...'];
const MEDIDA_OPTIONS = ['und', 'kg', 'gr', 'oz', 'lb', 'ml', 'L', 'Otro...'];
const PORCION_OPTIONS = ['porción', 'unidad', 'gramo', 'ml', 'slice', 'onza', 'Otro...'];

const InventoryScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { user } = useAuth();
  
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isRestockModalVisible, setIsRestockModalVisible] = useState(false);
  const [isRecipesDrawerVisible, setIsRecipesDrawerVisible] = useState(false);
  const [activePicker, setActivePicker] = useState(null);
  const [nameExists, setNameExists] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [isCustomValueActive, setIsCustomValueActive] = useState(false);
  
  const [recipes, setRecipes] = useState([]);
  const [restockData, setRestockData] = useState({
    cantidad: '1',
    precio: '0'
  });
  
  // State para nueva materia prima
  const [newItem, setNewItem] = useState({
    nombre: '',
    tipoEmpaque: 'Caja',
    unidadesPorEmpaque: '1',
    cantidadEmpaque: '0',
    cantDeUnd: '0',
    porcionesPorUnidad: '1',
    tipoPorcion: 'porcion',
    tipoMedida: 'und',
    cantPorcion: '0',
    costoPorEmpaque: '0',
    costoUnitario: '0',
    cantEntrada: '0',
    cantSalida: '0',
    stockMinimo: '5'
  });

  const loadInventory = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await fetchAlmacen();
      setInventory(data);
      setFilteredInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      console.log('🌐 [API] Cargando recetas...');
      const data = await fetchRecetas();
      console.log(`📖 [API] Recetas recibidas: ${data.length} filas`);
      
      if (data.length > 0) {
        console.log('📋 [API] Primer fila de receta:', data[0]);
      }

      // Agrupar recetas por producto (usando 'productos terminados')
      const grouped = data.reduce((acc, curr) => {
        // 1. Buscar producto (con prioridad y luego búsqueda profunda)
        let prod = curr['productos terminados'] || curr['Producto'] || curr['producto'];
        
        if (!prod || prod === '') {
          // Búsqueda profunda: el primer string que no sea vacío y no sea el ID o la unidad
          const values = Object.values(curr);
          prod = values.find(v => 
            typeof v === 'string' && 
            v.trim() !== '' && 
            v !== curr['tipo de porcion'] && 
            v !== String(curr['IDrecetas'])
          ) || 'Desconocido';
        }

        if (!acc[prod]) acc[prod] = [];
        acc[prod].push(curr);
        return acc;
      }, {});
      
      const recipesArray = Object.entries(grouped).map(([name, ingredients]) => ({ name, ingredients }));
      console.log(`✅ [API] Recetas agrupadas: ${recipesArray.length} productos`);
      setRecipes(recipesArray);
    } catch (error) {
      console.error('❌ Error loading recipes:', error);
    }
  };

  useEffect(() => {
    const filtered = inventory.filter(item => 
      item.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredInventory(filtered);
  }, [searchTerm, inventory]);

  // Validar si el nombre ya existe
  useEffect(() => {
    if (newItem.nombre) {
      const exists = inventory.some(item => 
        item.nombre?.toLowerCase().trim() === newItem.nombre.toLowerCase().trim()
      );
      setNameExists(exists);
    } else {
      setNameExists(false);
    }
  }, [newItem.nombre, inventory]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadInventory(false);
  };

  const handleAdjustStock = async (item, amount) => {
    try {
      // Optimistic update
      const newStock = Math.max(0, item.stockActual + amount);
      
      // Actualizar estado local inmediatamente para feedback rápido
      setInventory(prev => prev.map(a => 
        a.id === item.id ? { ...a, stockActual: newStock } : a
      ));
      
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(prev => ({ ...prev, stockActual: newStock }));
      }

      console.log(`📦 [INVENTARIO] Ajustando stock de ${item.nombre}: ${item.stockActual} -> ${newStock}`);

      const result = await updateAlmacenItem(item.id, {
        'cant. en almacen': newStock
      });
      
      console.log('📦 [INVENTARIO] Respuesta API:', result);
      
      if (!result.success) {
        // Rollback si falla
        loadInventory(false);
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      loadInventory(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newItem.nombre) return;
    setIsLoading(true);
    try {
      console.log('📦 [INVENTARIO] Añadiendo nueva materia prima:', newItem);
      
      const payload = {
        'Materia prima': newItem.nombre,
        'Tipo de empaque': newItem.tipoEmpaque,
        'Cant. de empaque': parseFloat(newItem.cantidadEmpaque) || 0,
        'Und. x empaque': parseFloat(newItem.unidadesPorEmpaque) || 0,
        'Costo empaque': parseFloat(newItem.costoPorEmpaque) || 0,
        'cant. de und.': parseFloat(newItem.cantDeUnd) || 0,
        'cant. en almacen': parseFloat(newItem.cantDeUnd) || 0,
        'cant. entrada': parseFloat(newItem.cantEntrada) || 0,
        'cant. de salida': parseFloat(newItem.cantSalida) || 0,
        'Porcion x und': parseFloat(newItem.porcionesPorUnidad) || 0,
        'Porcion': newItem.tipoPorcion,
        'Tipo medida': newItem.tipoMedida,
        'cant. porcion': parseFloat(newItem.cantPorcion) || 0,
        'Coste unitario': parseFloat(newItem.costoUnitario) || 0,
        'Coste total': (parseFloat(newItem.cantidadEmpaque) || 0) * (parseFloat(newItem.costoPorEmpaque) || 0),
        'Stock minimo': parseFloat(newItem.stockMinimo) || 5
      };

      const newId = `MP${Date.now().toString().slice(-6)}`;
      
      const result = await updateAlmacenItem(newId, payload);
      
      if (result.success) {
        setIsAddModalVisible(false);
        setNewItem({
          nombre: '',
          tipoEmpaque: 'Caja',
          unidadesPorEmpaque: '1',
          cantidadEmpaque: '0',
          cantDeUnd: '0',
          porcionesPorUnidad: '1',
          tipoPorcion: 'porcion',
          tipoMedida: 'und',
          cantPorcion: '0',
          costoPorEmpaque: '0',
          costoUnitario: '0',
          cantEntrada: '0',
          cantSalida: '0',
          stockMinimo: '5'
        });
        loadInventory();
      }
    } catch (error) {
      console.error('Error adding material:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestock = async () => {
    if (!selectedItem || !restockData.cantidad) return;
    setIsLoading(true);
    try {
      const addedQty = parseFloat(restockData.cantidad);
      const newPrice = parseFloat(restockData.precio);
      const newStock = selectedItem.stockActual + addedQty;
      
      console.log(`📦 [RESTOCK] Actualizando ${selectedItem.nombre}: +${addedQty} @ ${newPrice}`);

      const payload = {
        'cant. en almacen': newStock,
        'cant. entrada': (selectedItem.entradas || 0) + addedQty,
        'Coste unitario': newPrice
      };

      const result = await updateAlmacenItem(selectedItem.id, payload);
      
      if (result.success) {
        setIsRestockModalVisible(false);
        loadInventory();
      }
    } catch (error) {
      console.error('Error restocking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isLowStock = item.stockActual < 10; // Umbral de ejemplo
    
    return (
      <View style={{ marginBottom: spacing.md }}>
        <GlassPanel style={styles.card}>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
              console.log('📱 [TOUCH] Card pressed:', item.nombre);
              setSelectedItem(item);
              setIsModalVisible(true);
            }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons 
                  name={item.nombre.toLowerCase().includes('pan') ? 'bread-slice' : 'package-variant-closed'} 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.nameContainer}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.nombre}</Text>
                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                  {item.tipoEmpaque}: {item.unidadesPorEmpaque} {item.tipoMedida || 'und'}
                </Text>
              </View>
              {isLowStock && (
                <View style={styles.lowStockBadge}>
                  <Text style={styles.lowStockText}>STOCK BAJO</Text>
                </View>
              )}
            </View>

            <View style={styles.cardContent}>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ALMACÉN</Text>
                <Text style={[styles.statValue, { color: isLowStock ? '#FF4444' : colors.text }]}>
                  {item.stockActual}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PORCIONES</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {item.cantidadPorciones}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>COSTE UNIT.</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {formatPrice(item.costoUnitario)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.cardFooter}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.min((item.stockActual / 50) * 100, 100)}%`,
                      backgroundColor: isLowStock ? '#FF4444' : colors.primary 
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.restockButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => {
                  console.log('📱 [TOUCH] Restock button pressed:', item.nombre);
                  setSelectedItem(item);
                  setRestockData({
                    cantidad: '1',
                    precio: String(item.costoUnitario)
                  });
                  setIsRestockModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="plus-box" size={18} color={colors.primary} />
                <Text style={[styles.restockButtonText, { color: colors.primary }]}>AÑADIR COMPRA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassPanel>
      </View>
    );
  };

  return (
    <>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      
      <LinearGradient
        colors={darkMode ? ['#1a1a2e', '#16213e'] : ['#F8F9FA', '#E9ECEF']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <FontAwesome5 name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Inventario</Text>
          <TouchableOpacity 
            onPress={() => setIsRecipesDrawerVisible(true)} 
            style={styles.backButton}
          >
            <FontAwesome5 name="book-open" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <GlassPanel style={styles.searchBar}>
            <FontAwesome5 name="search" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar materia prima..."
              placeholderTextColor={colors.textSecondary}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </GlassPanel>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analizando existencias...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInventory}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant" size={80} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No se encontraron materias primas</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
      
      {/* Botón Flotante para Agregar */}
      {/* Modal de Detalles */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <GlassPanel style={styles.modalContent}>
              <LinearGradient
                colors={darkMode ? ['#1e1e30', '#161625'] : ['#FFFFFF', '#F0F2F5']}
                style={styles.modalGradient}
              >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Detalle de Insumo</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                  <FontAwesome5 name="times" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {selectedItem && (
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1 }}
                >
                  <View style={styles.modalInfoCard}>
                    <View style={styles.modalIconBox}>
                      <MaterialCommunityIcons 
                        name={selectedItem.nombre.toLowerCase().includes('pan') ? 'bread-slice' : 'package-variant-closed'} 
                        size={40} 
                        color={colors.primary} 
                      />
                    </View>
                    <Text style={[styles.modalItemName, { color: colors.text }]}>{selectedItem.nombre}</Text>
                    <Text style={[styles.modalItemId, { color: colors.textSecondary }]}>ID: {selectedItem.id}</Text>
                  </View>

                  <View style={styles.modalStatsGrid}>
                    <View style={[styles.modalStatItem, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>STOCK ACTUAL</Text>
                      <Text style={[styles.modalStatValue, { color: colors.text }]}>{selectedItem.stockActual} {selectedItem.tipoEmpaque}</Text>
                    </View>
                    <View style={[styles.modalStatItem, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>PORCIONES</Text>
                      <Text style={[styles.modalStatValue, { color: colors.text }]}>{selectedItem.cantidadPorciones} {selectedItem.tipoMedida}</Text>
                    </View>
                    <View style={[styles.modalStatItem, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>COSTE UNIT.</Text>
                      <Text style={[styles.modalStatValue, { color: colors.text }]}>{formatPrice(selectedItem.costoUnitario)}</Text>
                    </View>
                    <View style={styles.modalRow}>
                      <View style={[styles.modalStatItem, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                        <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>VALOR TOTAL</Text>
                        <Text style={[styles.modalStatValue, { color: colors.primary, fontWeight: '900' }]}>{formatPrice(selectedItem.costoTotal || (selectedItem.stockActual * selectedItem.costoUnitario))}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalActionsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GESTIÓN DE STOCK</Text>
                    <View style={styles.modalButtonsRow}>
                      <TouchableOpacity 
                        style={[styles.modalAdjustButton, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                        onPress={() => {
                          setIsModalVisible(false);
                          setRestockData({
                            cantidad: '1',
                            precio: String(selectedItem.costoUnitario)
                          });
                          setIsRestockModalVisible(true);
                        }}
                      >
                        <MaterialCommunityIcons name="plus-box" size={20} color={colors.primary} />
                        <Text style={{ color: colors.primary, marginLeft: 10, fontWeight: '700' }}>REGISTRAR COMPRA</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Empaque:</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.tipoEmpaque} ({selectedItem.unidadesPorEmpaque} unds)</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Porción por unidad:</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedItem.porcionesPorUnidad} {selectedItem.tipoMedida}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Entradas totales:</Text>
                      <Text style={[styles.detailValue, { color: '#4ECDC4' }]}>{selectedItem.entradas}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Salidas totales:</Text>
                      <Text style={[styles.detailValue, { color: '#FF6B6B' }]}>{selectedItem.salidas}</Text>
                    </View>
                  </View>
                </ScrollView>
              )}
            </LinearGradient>
          </GlassPanel>
        </View>
      </KeyboardAvoidingView>
    </Modal>

      {/* Drawer de Recetas */}
      <Modal
        visible={isRecipesDrawerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsRecipesDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <TouchableOpacity 
            style={styles.drawerDismiss} 
            activeOpacity={1} 
            onPress={() => setIsRecipesDrawerVisible(false)} 
          />
          <GlassPanel style={styles.drawerContent}>
            <LinearGradient
              colors={darkMode ? ['#1e1e30', '#161625'] : ['#FFFFFF', '#F0F2F5']}
              style={styles.drawerGradient}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 }]}>Libro de Recetas</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Ingredientes por Producto</Text>
                </View>
                <TouchableOpacity onPress={() => setIsRecipesDrawerVisible(false)} style={styles.closeButton}>
                  <FontAwesome5 name="times" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {recipes.length > 0 ? recipes.map((recipe, idx) => (
                  <View key={idx} style={styles.recipeCard}>
                    <View style={styles.recipeHeader}>
                      <View style={{ backgroundColor: colors.primary + '20', padding: 8, borderRadius: 10 }}>
                        <FontAwesome5 name="hamburger" size={14} color={colors.primary} />
                      </View>
                      <Text style={[styles.recipeName, { color: colors.text }]}>{recipe.name}</Text>
                    </View>
                    <View style={styles.ingredientsList}>
                      {recipe.ingredients.map((ing, iidx) => {
                        // Mapeo ultra-robusto para ingredientes
                        let ingName = ing['ingrediente'] || ing['Ingrediente'] || ing['ingredientes'] || ing['Ingredientes'];
                        
                        // Búsqueda profunda si está vacío
                        if (!ingName || ingName === '') {
                          const values = Object.values(ing);
                          ingName = values.find(v => 
                            typeof v === 'string' && 
                            v.trim() !== '' && 
                            v !== ing['tipo de porcion'] && 
                            v !== String(ing['IDrecetas']) &&
                            v !== recipe.name // Que no sea el nombre del producto de nuevo
                          ) || 'Ingrediente';
                        }

                        const ingQty = ing['cant. pocion'] || ing['Cantidad'] || ing['cantidad'] || '0';
                        const ingUnit = ing['tipo de porcion'] || ing['Unidad'] || ing['unidad'] || 'und';
                        
                        return (
                          <View key={iidx} style={styles.ingredientRow}>
                            <Text style={[styles.ingName, { color: colors.textSecondary }]}>• {ingName}</Text>
                            <Text style={[styles.ingQty, { color: colors.text }]}>{ingQty} {ingUnit}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )) : (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>Cargando recetas...</Text>
                )}
              </ScrollView>
            </LinearGradient>
          </GlassPanel>
        </View>
      </Modal>

      {/* Modal Selector Personalizado */}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setIsAddModalVisible(true)}
      >
        <FontAwesome5 name="plus" size={20} color="#FFF" />
      </TouchableOpacity>

      {/* Modal para Agregar Materia Prima */}
      <Modal
        visible={isAddModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <GlassPanel style={styles.modalContent}>
              <LinearGradient
                colors={darkMode ? ['#1e1e30', '#161625'] : ['#FFFFFF', '#F0F2F5']}
                style={styles.modalGradient}
              >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Nueva Materia Prima</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity 
                    onPress={handleAddMaterial} 
                    style={[styles.closeButton, { marginRight: 15, backgroundColor: colors.primary + '20', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }]}
                  >
                    <FontAwesome5 name="check" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>Guardar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={styles.closeButton}>
                    <FontAwesome5 name="times" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 60 }}
              >
                <View style={styles.formGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NOMBRE</Text>
                    {nameExists && (
                      <Text style={{ fontSize: 9, color: '#FF6B6B', fontWeight: 'bold' }}>⚠️ YA EXISTE EN INVENTARIO</Text>
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.modalInput, 
                      { color: colors.text, borderColor: nameExists ? '#FF6B6B' : colors.border },
                      nameExists && { backgroundColor: 'rgba(255, 107, 107, 0.05)' }
                    ]}
                    placeholder="Ej. Harina de Trigo"
                    placeholderTextColor={colors.textSecondary}
                    value={newItem.nombre}
                    onChangeText={(val) => setNewItem({...newItem, nombre: val})}
                  />
                  {newItem.nombre.length > 1 && !nameExists && inventory.filter(item => item.nombre.toLowerCase().includes(newItem.nombre.toLowerCase())).length > 0 && (
                    <View style={{ marginTop: 5, flexDirection: 'row', flexWrap: 'wrap' }}>
                      {inventory
                        .filter(item => item.nombre.toLowerCase().includes(newItem.nombre.toLowerCase()))
                        .slice(0, 3)
                        .map((item, idx) => (
                          <TouchableOpacity 
                            key={idx} 
                            onPress={() => setNewItem({...newItem, nombre: item.nombre})}
                            style={{ 
                              backgroundColor: colors.primary + '15', 
                              paddingHorizontal: 10, 
                              paddingVertical: 5, 
                              borderRadius: 15, 
                              marginRight: 8, 
                              marginBottom: 5,
                              borderWidth: 1,
                              borderColor: colors.primary + '30'
                            }}
                          >
                            <Text style={{ color: colors.primary, fontSize: 11 }}>{item.nombre}</Text>
                          </TouchableOpacity>
                        ))
                      }
                    </View>
                  )}
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMPAQUE</Text>
                    <TouchableOpacity 
                      style={[styles.modalInput, { justifyContent: 'center', borderColor: colors.border }]}
                      onPress={() => setActivePicker({
                        field: 'tipoEmpaque',
                        options: EMPAQUE_OPTIONS,
                        title: 'Seleccionar Empaque'
                      })}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: newItem.tipoEmpaque ? colors.text : colors.textSecondary }}>
                          {newItem.tipoEmpaque || 'Seleccionar...'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>UNDS X EMP.</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      value={newItem.unidadesPorEmpaque}
                      onChangeText={(val) => {
                        const undXemp = parseFloat(val) || 0;
                        const cantEmp = parseFloat(newItem.cantidadEmpaque) || 0;
                        const costEmp = parseFloat(newItem.costoPorEmpaque) || 0;
                        
                        const totalUnds = cantEmp * undXemp;
                        const unitCost = undXemp > 0 ? costEmp / undXemp : 0;
                        const porcXund = parseFloat(newItem.porcionesPorUnidad) || 0;

                        setNewItem({
                          ...newItem, 
                          unidadesPorEmpaque: val, 
                          cantDeUnd: String(totalUnds),
                          costoUnitario: unitCost.toFixed(2),
                          cantPorcion: String(totalUnds * porcXund)
                        });
                      }}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CANT. EMPAQUE</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      value={newItem.cantidadEmpaque}
                      onChangeText={(val) => {
                        const cantEmp = parseFloat(val) || 0;
                        const undXemp = parseFloat(newItem.unidadesPorEmpaque) || 0;
                        const totalUnds = cantEmp * undXemp;
                        const porcXund = parseFloat(newItem.porcionesPorUnidad) || 0;
                        setNewItem({
                          ...newItem, 
                          cantidadEmpaque: val, 
                          cantDeUnd: String(totalUnds),
                          cantPorcion: String(totalUnds * porcXund)
                        });
                      }}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>TOTAL UNIDADES</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                      keyboardType="numeric"
                      editable={false}
                      value={newItem.cantDeUnd}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>MEDIDA (und, kg, gr)</Text>
                    <TouchableOpacity 
                      style={[styles.modalInput, { justifyContent: 'center', borderColor: colors.border }]}
                      onPress={() => setActivePicker({
                        field: 'tipoMedida',
                        options: MEDIDA_OPTIONS,
                        title: 'Unidad de Medida'
                      })}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: newItem.tipoMedida ? colors.text : colors.textSecondary }}>
                          {newItem.tipoMedida || 'Seleccionar...'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>TIPO PORCIÓN (ej: slice)</Text>
                    <TouchableOpacity 
                      style={[styles.modalInput, { justifyContent: 'center', borderColor: colors.border }]}
                      onPress={() => setActivePicker({
                        field: 'tipoPorcion',
                        options: PORCION_OPTIONS,
                        title: 'Tipo de Porción'
                      })}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: newItem.tipoPorcion ? colors.text : colors.textSecondary }}>
                          {newItem.tipoPorcion || 'Seleccionar...'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PORCION X UND</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      value={newItem.porcionesPorUnidad}
                      onChangeText={(val) => {
                        const unds = parseFloat(newItem.cantDeUnd) || 0;
                        const porcXund = parseFloat(val) || 0;
                        setNewItem({...newItem, porcionesPorUnidad: val, cantPorcion: String(unds * porcXund)});
                      }}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>TOTAL PORCIONES</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                      keyboardType="numeric"
                      editable={false}
                      value={newItem.cantPorcion}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>COSTO EMPAQUE (RD$)</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: 'rgba(78, 205, 196, 0.05)' }]}
                      keyboardType="numeric"
                      placeholder="0.00"
                      value={newItem.costoPorEmpaque}
                      onChangeText={(val) => {
                        const costEmp = parseFloat(val) || 0;
                        const undXemp = parseFloat(newItem.unidadesPorEmpaque) || 1;
                        const unitCost = costEmp / undXemp;
                        
                        setNewItem({
                          ...newItem, 
                          costoPorEmpaque: val,
                          costoUnitario: unitCost.toFixed(2)
                        });
                      }}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>COSTO UNITARIO (RD$)</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                      keyboardType="numeric"
                      editable={false}
                      value={newItem.costoUnitario}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>VALOR TOTAL (RD$)</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.primary, borderColor: colors.border, backgroundColor: 'rgba(78, 205, 196, 0.1)', fontWeight: 'bold' }]}
                      keyboardType="numeric"
                      editable={false}
                      value={formatPrice((parseFloat(newItem.cantidadEmpaque) || 0) * (parseFloat(newItem.costoPorEmpaque) || 0))}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>STOCK MÍNIMO (Alerta)</Text>
                    <TextInput
                      style={[styles.modalInput, { color: '#FF6B6B', borderColor: colors.border }]}
                      keyboardType="numeric"
                      value={newItem.stockMinimo}
                      onChangeText={(val) => setNewItem({...newItem, stockMinimo: val})}
                    />
                  </View>
                </View>

                {/* Resumen de Cálculo en Vivo */}
                <View style={styles.calculationSummary}>
                  <Text style={styles.summaryTitle}>RESUMEN DE CÁLCULO</Text>
                  <View style={styles.summaryRow}>
                    <MaterialCommunityIcons name="calculator" size={14} color={colors.textSecondary} />
                    <Text style={styles.summaryText}>
                      Stock: <Text style={{fontWeight:'bold'}}>{newItem.cantidadEmpaque || 0}</Text> {newItem.tipoEmpaque || 'empaques'} × <Text style={{fontWeight:'bold'}}>{newItem.unidadesPorEmpaque || 0}</Text> unds = <Text style={{color: colors.primary, fontWeight:'bold'}}>{newItem.cantDeUnd || 0} unidades totales</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <MaterialCommunityIcons name="chart-pie" size={14} color={colors.textSecondary} />
                    <Text style={styles.summaryText}>
                      Rendimiento: <Text style={{fontWeight:'bold'}}>{newItem.cantDeUnd || 0}</Text> unds × <Text style={{fontWeight:'bold'}}>{newItem.porcionesPorUnidad || 0}</Text> {newItem.tipoPorcion || 'porc.'} = <Text style={{color: '#4ECDC4', fontWeight:'bold'}}>{newItem.cantPorcion || 0} porciones listas</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ENTRADAS</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      value={newItem.cantEntrada}
                      onChangeText={(val) => setNewItem({...newItem, cantEntrada: val})}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SALIDAS</Text>
                    <TextInput
                      style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                      keyboardType="numeric"
                      value={newItem.cantSalida}
                      onChangeText={(val) => setNewItem({...newItem, cantSalida: val})}
                    />
                  </View>
                </View>

              </ScrollView>

            </LinearGradient>
          </GlassPanel>
        </View>
      </KeyboardAvoidingView>
    </Modal>
      {/* Modal para Re-abastecimiento (Restock) */}
      <Modal
        visible={isRestockModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRestockModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <GlassPanel style={[styles.modalContent, { maxWidth: 400 }]}>
              <LinearGradient
                colors={darkMode ? ['#1e1e30', '#161625'] : ['#FFFFFF', '#F0F2F5']}
                style={styles.modalGradient}
              >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Registrar Compra</Text>
                <TouchableOpacity onPress={() => setIsRestockModalVisible(false)} style={styles.closeButton}>
                  <FontAwesome5 name="times" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: colors.textSecondary, marginBottom: 20, textAlign: 'center' }}>
                Añadiendo stock para: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{selectedItem?.nombre}</Text>
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CANTIDAD A AÑADIR ({selectedItem?.tipoEmpaque})</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                  keyboardType="numeric"
                  value={restockData.cantidad}
                  onChangeText={(val) => setRestockData({...restockData, cantidad: val})}
                  autoFocus
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NUEVO PRECIO DE COMPRA (RD$)</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                  keyboardType="numeric"
                  placeholder="0.00"
                  value={restockData.precio}
                  onChangeText={(val) => setRestockData({...restockData, precio: val})}
                />
              </View>

              <View style={[styles.calculationSummary, { marginTop: 10 }]}>
                <Text style={styles.summaryText}>
                  Incremento de Valor: <Text style={{color: colors.primary, fontWeight:'bold'}}>{formatPrice((parseFloat(restockData.cantidad) || 0) * (parseFloat(restockData.precio) || 0))}</Text>
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#4ECDC4', marginTop: 10 }]}
                onPress={handleRestock}
              >
                <Text style={styles.saveButtonText}>CONFIRMAR ENTRADA</Text>
              </TouchableOpacity>
            </LinearGradient>
          </GlassPanel>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backButton: {
    padding: 10,
  },
  searchContainer: {
    marginTop: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 15,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 15,
    padding: 18,
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  nameContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  lowStockBadge: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
  },
  lowStockText: {
    color: '#FF4444',
    fontSize: 10,
    fontWeight: '900',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginRight: 15,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  restockButton: {
    flexDirection: 'row',
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restockButtonText: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 9999,
  },
  modalRow: {
    width: '100%',
    flexDirection: 'row',
    marginTop: 10,
  },
  modalActionsSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 15,
    letterSpacing: 1,
    textAlign: 'center',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 15,
  },
  modalAdjustButton: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 10000,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    borderRadius: 30,
    elevation: 10,
    zIndex: 10001,
  },
  modalGradient: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    padding: 5,
  },
  modalInfoCard: {
    alignItems: 'center',
    marginBottom: 25,
  },
  modalIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalItemName: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalItemId: {
    fontSize: 14,
    marginTop: 5,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
  },
  modalStatItem: {
    flex: 1,
    minWidth: '45%',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 5,
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  detailsList: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 15,
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 15,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  saveButton: {
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  calculationSummary: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 15,
    padding: 15,
    marginTop: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#4ECDC4',
    marginBottom: 8,
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerDismiss: {
    flex: 1,
  },
  drawerContent: {
    width: '85%',
    height: '100%',
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    overflow: 'hidden',
  },
  drawerGradient: {
    flex: 1,
    padding: 25,
    paddingTop: 50,
  },
  recipeCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 10,
  },
  ingredientsList: {
    paddingLeft: 26,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  ingName: {
    fontSize: 13,
  },
  ingQty: {
    fontSize: 13,
    fontWeight: '600',
  }
});

export default InventoryScreen;
