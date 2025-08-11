import { StyleSheet } from 'react-native';
import theme from '../theme';

const { colors, spacing, typography, dimensions, borders, shadows } = theme;

export const globalStyles = StyleSheet.create({
  // Contenedores
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  // Textos
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  subtitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  bodyText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.regular,
    color: colors.text.secondary,
    lineHeight: 24,
  },

  caption: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.text.light,
  },

  // Botones
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },

  primaryButtonText: {
    color: colors.text.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },

  secondaryButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borders.radius.md,
    borderWidth: borders.width.thin,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },

  // Inputs
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: borders.width.thin,
    borderColor: colors.border,
    borderRadius: borders.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },

  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borders.radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: spacing.md,
    ...shadows.small,
  },

  // Cards
  card: {
    backgroundColor: colors.background,
    borderRadius: borders.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.medium,
  },

  productCard: {
    backgroundColor: colors.background,
    borderRadius: borders.radius.lg,
    padding: spacing.sm,
    margin: spacing.xs,
    alignItems: 'center',
    ...shadows.small,
  },

  // Imágenes
  productImage: {
    width: dimensions.window.width * 0.4,
    height: dimensions.window.width * 0.3,
    borderRadius: borders.radius.md,
    marginBottom: spacing.sm,
  },

  productImageDetail: {
    width: dimensions.window.width - (spacing.md * 2),
    height: 200,
    borderRadius: borders.radius.lg,
    marginBottom: spacing.md,
  },

  cartImage: {
    width: 60,
    height: 60,
    borderRadius: borders.radius.sm,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  errorText: {
    fontSize: typography.sizes.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Lista vacía
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  emptyText: {
    fontSize: typography.sizes.lg,
    color: colors.text.light,
    textAlign: 'center',
  },

  // Separadores
  separator: {
    height: borders.width.thin,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  // Badges
  badge: {
    backgroundColor: colors.primary,
    borderRadius: borders.radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: colors.text.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});

export default globalStyles;