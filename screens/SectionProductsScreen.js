import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import ProductItem from '../components/ProductItem';
import theme from '../theme/theme';
import { useTheme } from 'react-native-elements';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors } from '../theme/theme';


const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
const { spacing, typography } = theme;

const SectionProductsScreen = ({ route, navigation }) => {
  const { sectionName, products } = route.params;
  // const { theme: { colors } } = useTheme();

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color={colors.text.white} />
        </TouchableOpacity>
        <Text style={styles.title}>{sectionName}</Text>
      </View>
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <View style={styles.productContainer}>
            <ProductItem product={item} onPress={handleProductPress} showBadges showRating />
          </View>
        )}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 18,
      paddingHorizontal: 16,
    },
    backButton: {
      marginRight: 16,
      padding: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text.white,
    },
    productContainer: {
      flex: 1,
      backgroundColor: colors.surface, // Fondo tipo placeholder
      borderRadius: 12,
      padding: 12,
      margin: 8,
      alignItems: 'center', // Centra imagen y texto
      justifyContent: 'center',
      elevation: 2, // Sombra para Android
      shadowColor: colors.text.primary, // Sombra para iOS
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      minHeight: 220, // Altura mínima tipo placeholder
    },
  });

export default SectionProductsScreen;
