import { StyleSheet } from 'react-native';
import { typography, spacing, borders } from '../theme/theme';

const getProductListScreenStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.medium,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.white,
  },
  filterSortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.small,
    backgroundColor: colors.surface,
    borderBottomWidth: borders.thin,
    borderBottomColor: colors.border,
  },
  filterSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderRadius: borders.radius.small,
    backgroundColor: colors.card,
  },
  filterSortButtonText: {
    marginLeft: spacing.small,
    ...typography.body2,
    color: colors.text.primary,
  },
  filterContainer: {
    padding: spacing.medium,
    backgroundColor: colors.background,
  },
  filterTitle: {
    ...typography.h6,
    marginBottom: spacing.small,
    color: colors.text.primary,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.medium,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borders.radius.small,
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    marginRight: spacing.small,
    marginBottom: spacing.small,
    borderWidth: borders.thin,
    borderColor: colors.border,
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterIcon: {
    marginRight: spacing.extraSmall,
  },
  filterText: {
    ...typography.body2,
    color: colors.text.primary,
  },
  activeFilterText: {
    color: colors.text.white,
  },
  sortOptionsContainer: {
    padding: spacing.medium,
    backgroundColor: colors.background,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    marginBottom: spacing.extraSmall,
    borderRadius: borders.radius.small,
    backgroundColor: colors.card,
    borderWidth: borders.thin,
    borderColor: colors.border,
  },
  activeSortOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortOptionText: {
    marginLeft: spacing.small,
    ...typography.body2,
    color: colors.text.primary,
  },
  activeSortOptionText: {
    color: colors.text.white,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  noResultsText: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  closestProductContainer: {
    marginTop: spacing.medium,
    padding: spacing.medium,
    backgroundColor: colors.card,
    borderRadius: borders.radius.medium,
    borderWidth: borders.thin,
    borderColor: colors.border,
    alignItems: 'center',
  },
  closestProductText: {
    ...typography.body2,
    color: colors.text.primary,
    marginBottom: spacing.small,
    textAlign: 'center',
  },
  closestProductButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: borders.radius.small,
  },
  closestProductButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
  recentSearchesContainer: {
    padding: spacing.medium,
    backgroundColor: colors.background,
    borderBottomWidth: borders.thin,
    borderBottomColor: colors.border,
  },
  recentSearchesTitle: {
    ...typography.h6,
    marginBottom: spacing.small,
    color: colors.text.primary,
  },
  recentSearchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.small,
    borderBottomWidth: borders.thin,
  },
  recentSearchText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  clearRecentSearchesButton: {
    marginTop: spacing.small,
    alignSelf: 'flex-end',
  },
  clearRecentSearchesText: {
    ...typography.button,
    color: colors.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  errorText: {
    ...typography.body1,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.medium,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: borders.radius.small,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
  // Estilos para el modal de filtros y ordenamiento
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borders.radius.large,
    width: '90%',
    maxHeight: '80%',
    padding: spacing.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.small,
  },
  closeButtonText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  modalSectionTitle: {
    ...typography.h6,
    marginTop: spacing.medium,
    marginBottom: spacing.small,
    color: colors.text.primary,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    marginBottom: spacing.extraSmall,
    borderRadius: borders.radius.small,
    backgroundColor: colors.card,
    borderWidth: borders.thin,
    borderColor: colors.border,
  },
  modalActiveOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalOptionText: {
    marginLeft: spacing.small,
    ...typography.body2,
    color: colors.text.primary,
  },
  modalActiveOptionText: {
    color: colors.text.white,
  },
  applyFiltersButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.medium,
    borderRadius: borders.radius.medium,
    alignItems: 'center',
    marginTop: spacing.large,
  },
  applyFiltersButtonText: {
    ...typography.button,
    color: colors.text.white,
  },
  listContainer: {
    paddingBottom: spacing.lg,
  },
  
  header: {
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
  },
  
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  
  statsText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  
  offersText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
  
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: borders.radius.md,
    backgroundColor: colors.surface,
  },
  
  filterToggleText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.sm,
  },
  
  filtersContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borders.radius.md,
  },
  
  filtersSection: {
    marginBottom: spacing.md,
  },
  
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borders.radius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  filterIcon: {
    marginRight: spacing.xs,
  },
  
  filterText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  
  activeFilterText: {
    color: colors.text.white,
  },
  sectionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borders.radius.lg,
    marginHorizontal: 12,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    ...theme.shadows.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  seeMoreButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  seeMoreText: {
    color: colors.text.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  horizontalList: {
    paddingVertical: spacing.sm,
  },
  horizontalProductItem: {
    marginRight: spacing.md,
    width: 160,
  },
  sectionSeparator: {
    height: 12,
    backgroundColor: 'transparent',
  },
});

export default getProductListScreenStyles;