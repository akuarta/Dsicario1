// DEPRECATED: Este archivo ha sido reemplazado por el nuevo sistema de temas
// Se mantiene para compatibilidad temporal
// Usar: import globalStyles from '../styles/globalStyles';
// Usar: import theme from '../theme';

import { StyleSheet, Dimensions } from 'react-native';
import theme from '../theme';
import globalStyles from '../styles/globalStyles';

const { width, height } = Dimensions.get('window');
const { colors, spacing, typography, borders } = theme;

// Estilos legacy - DEPRECATED
const styles = StyleSheet.create({
  // Redirigir a los nuevos estilos globales
  container: globalStyles.container,
  detailContainer: globalStyles.container,
  searchContainer: {
    ...globalStyles.searchInput,
    width: '90%',
    height: 40,
  },
  button: globalStyles.primaryButton,
  title: globalStyles.title,
  
  // Estilos específicos que aún se usan
  productItem: {
    width: width * 0.45,
    backgroundColor: colors.background,
    borderRadius: borders.radius.lg,
    padding: spacing.sm,
    margin: spacing.xs,
    alignItems: 'center',
    ...theme.shadows.small,
  },
  
  image: {
    width: width * 0.35,
    height: width * 0.25,
    borderRadius: borders.radius.md,
    marginBottom: spacing.sm,
  },
  
  imageDetail: {
    width: '100%',
    height: 200,
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  
  imageCart: {
    width: 60,
    height: 60,
    borderRadius: borders.radius.sm,
  },
  
  productName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  
  category: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  
  productPrice: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  
  price: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  
  quantityLabel: {
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  quantity: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginHorizontal: spacing.md,
  },
  
  delQuantityButton: {
    backgroundColor: colors.error,
    borderRadius: borders.radius.round,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  addQuantityButton: {
    backgroundColor: colors.primary,
    borderRadius: borders.radius.round,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  buttonText: {
    color: colors.text.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  
  // Estilos del carrito
  cartContainer: {
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  
  cartItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  
  cartItemName: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  
  cartItemQuantity: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginHorizontal: spacing.md,
  },
  
  cartItemPrice: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginHorizontal: spacing.sm,
  },
  
  cartItemRemoveButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borders.radius.sm,
  },
  
  cartItemRemoveText: {
    color: colors.text.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  
  // Checkout
  checkoutContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  totalCost: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  
  checkoutButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.md,
  },
  
  checkoutButtonText: {
    color: colors.text.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  
  // Placeholder styles - simplificados
  fadeContainer: {
    flex: 1,
    padding: spacing.md,
  },
  
  subContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  
  box1: {
    width: '45%',
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: borders.radius.md,
  },
  
  box2: {
    width: '45%',
    height: 20,
    backgroundColor: colors.surface,
    borderRadius: borders.radius.sm,
    marginBottom: spacing.xs,
  },
  
  box3: {
    width: '45%',
    height: 16,
    backgroundColor: colors.surface,
    borderRadius: borders.radius.sm,
  },
  
  // Floating button
  touchableOpacityStyle: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
    borderRadius: 28,
    ...theme.shadows.large,
  },
  
  floatingButtonStyle: {
    width: 24,
    height: 24,
    tintColor: colors.text.white,
  },
  
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  
  segmentedControlContainer: {
    padding: spacing.md,
  },
});

export default styles;