import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCart } from '../contexts/AppContext';
import globalStyles from '../styles/globalStyles';
import theme from '../theme';

const { colors, spacing, typography, borders } = theme;

const ProfileScreen = ({ navigation }) => {
  const { clearCart, getTotalItems } = useCart();
  const totalItems = getTotalItems();

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
      onPress: () => navigation.navigate('PurchaseHistory'),
    },
    {
      id: 3,
      title: 'Favoritos',
      subtitle: 'Productos guardados',
      icon: 'heart',
      onPress: () => navigation.navigate('Favorites'),
    },
    {
      id: 4,
      title: 'Configuración',
      subtitle: 'Ajustes de la aplicación',
      icon: 'cog',
      onPress: () => showAlert('Próximamente', 'Esta función estará disponible pronto')
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

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <FontAwesome5 name="user" size={32} color={colors.text.white} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Usuario</Text>
              <Text style={styles.userEmail}>usuario@dsicario.com</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
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

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
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
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  
  destructiveIcon: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
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
});

export default ProfileScreen;
