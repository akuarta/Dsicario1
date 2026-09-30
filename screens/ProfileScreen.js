import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert,
  Switch,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../contexts/UserContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCart } from '../contexts/AppContext';
// import { useTheme } from 'react-native-elements';
import { useGlobalStyles } from '../styles/globalStyles';
import { getThemeColors, spacing, typography, borders } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { showAlert } from '../utils/showAlert';

const ProfileScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const globalStyles = useGlobalStyles(colors);
  
  const { clearCart, getTotalItems } = useCart();
  const { username, email, role, userTypeId, isClientMode, setIsClientMode } = useUser();
  const totalItems = getTotalItems();

  const isOwner = email?.toLowerCase()?.trim() === 'hairoman28@gmail.com';
  const isStaff = !!(role && (
    role.toLowerCase().includes('admin') || 
    role.toLowerCase().includes('cocina') || 
    role.toLowerCase().includes('delivery') || 
    role.toLowerCase().includes('repartidor') || 
    role.toLowerCase().includes('mesero') ||
    role.toLowerCase().includes('cosina')
  )) || isOwner;

  const handleClearCart = () => {
    if (totalItems === 0) {
      showAlert('Carrito vacío', 'No hay productos en el carrito');
      return;
    }

    showAlert(
      'Vaciar carrito',
      '¿Estás seguro de que quieres vaciar todo el carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Vaciar', 
          style: 'destructive',
          onPress: () => {
            clearCart();
            showAlert('Carrito vaciado', 'Se han removido todos los productos del carrito');
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      id: 7,
      title: 'Centro de Pedidos',
      subtitle: 'Seguimiento en vivo y rastreo',
      icon: 'map-marked-alt',
      onPress: () => navigation.navigate('OrderCenter'),
      showBadge: true, // Siempre visible o condicional
      badgeCount: 0 
    },
    {
      id: 1,
      title: 'Mi Carrito',
      subtitle: `${totalItems} productos`,
      icon: 'shopping-cart',
      onPress: () => navigation.navigate('Carrito'),
      showBadge: totalItems > 0,
      badgeCount: totalItems
    },
    {
      id: 2,
      title: 'Historial de Compras',
      subtitle: 'Ver compras anteriores',
      icon: 'history',
      onPress: () => navigation.navigate('Historial'),
    },
    {
      id: 3,
      title: 'Favoritos',
      subtitle: 'Productos guardados',
      icon: 'heart',
      onPress: () => navigation.navigate('Favoritos'),
    },
    {
      id: 4,
      title: 'Configuración',
      subtitle: 'Ajustes de la aplicación',
      icon: 'cog',
      onPress: () => navigation.navigate('Configuracion')
    },
    {
      id: 5,
      title: 'Vaciar Carrito',
      subtitle: 'Remover todos los productos',
      icon: 'trash',
      onPress: handleClearCart,
      isDestructive: true
    },
    {
      id: 6,
      title: 'Acerca de',
      subtitle: 'Información de la app',
      icon: 'info-circle',
      onPress: () => showAlert(
        'DSicario v1.0',
        'Aplicación de e-commerce desarrollada con React Native\n\n© 2024 DSicario'
      )
    }
  ];

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        item.isDestructive && styles.destructiveItem
      ]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <View style={[
          styles.iconContainer,
          item.isDestructive && styles.destructiveIcon
        ]}>
          <FontAwesome5 
            name={item.icon} 
            size={20} 
            color={item.isDestructive ? colors.error : colors.primary} 
          />
        </View>
        <View style={styles.menuItemText}>
          <Text style={[
            styles.menuItemTitle,
            item.isDestructive && styles.destructiveText
          ]}>
            {item.title}
          </Text>
          <Text style={styles.menuItemSubtitle}>
            {item.subtitle}
          </Text>
        </View>
      </View>
      
      <View style={styles.menuItemRight}>
        {item.showBadge && item.badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.badgeCount > 99 ? '99+' : item.badgeCount}
            </Text>
          </View>
        )}
        <FontAwesome5 
          name="chevron-right" 
          size={16} 
          color={colors.text.light} 
        />
      </View>
    </TouchableOpacity>
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xl,
    },
    
    profileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    avatarContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
  
    userInfo: {
      flex: 1,
    },
  
    userName: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.bold,
      color: colors.text.white,
      marginBottom: spacing.xs,
    },
  
    userEmail: {
      fontSize: typography.sizes.md,
      color: 'rgba(255,255,255,0.8)',
    },
  
    menuContainer: {
      paddingVertical: spacing.md,
    },
  
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  
    destructiveItem: {
      backgroundColor: colors.error + '05',
    },
  
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
  
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: borders.radius.md,
      backgroundColor: colors.primary + '10',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
  
    destructiveIcon: {
      backgroundColor: colors.error + '10',
    },
  
    menuItemText: {
      flex: 1,
    },
  
    menuItemTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.medium,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
  
    destructiveText: {
      color: colors.error,
    },
  
    menuItemSubtitle: {
      fontSize: typography.sizes.sm,
      color: colors.text.light,
    },
  
    menuItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  
    badge: {
      backgroundColor: colors.primary,
      borderRadius: borders.radius.round,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginRight: spacing.sm,
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    badgeText: {
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.bold,
      color: colors.text.white,
    },
  
    footer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
    },
  
    footerText: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      color: colors.text.light,
      marginBottom: spacing.xs,
    },
  
    footerSubtext: {
      fontSize: typography.sizes.sm,
      color: colors.text.light,
      textAlign: 'center',
    },
  }), [colors, darkMode]);

  return (
    <SafeAreaView style={[globalStyles.container, darkMode && { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={{ marginBottom: spacing.md, alignSelf: 'flex-start', padding: 5 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5 name="arrow-left" size={20} color={colors.text.white} />
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image 
                source={require('../assets/logo.png')} 
                style={{ width: 56, height: 56, borderRadius: 28 }} 
                resizeMode="contain" 
              />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{username || 'Usuario'}</Text>
              <Text style={styles.userEmail}>{userTypeId ? `Código: ${userTypeId}` : email}</Text>
            </View>
          </View>
        </View>

        {/* Admin/Staff Mode Toggle */}
        {isStaff && (
          <View style={{ marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.xs }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsClientMode(!isClientMode)}
              style={{
                backgroundColor: isClientMode ? '#1E293B' : colors.primary,
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
                borderWidth: 1,
                borderColor: isClientMode ? '#334155' : 'transparent',
              }}
            >
              <FontAwesome5 
                name={isClientMode ? "user-shield" : "user"} 
                size={16} 
                color="#FFF" 
              />
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 }}>
                {isClientMode ? 'CAMBIAR A MODO PERSONAL' : 'CAMBIAR A MODO CLIENTE'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.menuContainer}>
          {menuItems.map(renderMenuItem)}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DSicario v1.0
          </Text>
          <Text style={styles.footerSubtext}>
            Hecho con ❤️ en República Dominicana
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

};

export default ProfileScreen;