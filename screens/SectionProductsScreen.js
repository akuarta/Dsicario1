import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import ProductItem from '../components/ProductItem';
import { CustomHeader } from '../components/CustomHeader';
import { getThemeColors, spacing, typography } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const SectionProductsScreen = ({ route, navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { sectionName, products } = route.params;

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    productContainer: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      margin: 8,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: colors.text?.primary || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      minHeight: 220,
    },
  }), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title={sectionName || 'Sección'} showBack={true} />
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <View style={styles.productContainer}>
            <ProductItem product={item} onPress={handleProductPress} showBadges showRating />
          </View>
        )}
        keyExtractor={(item, index) => (item.id || index).toString()}
        contentContainerStyle={{
          padding: 16,
        }}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default SectionProductsScreen;
