import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import theme from '../theme';

const { colors, spacing, typography, borders } = theme;

/**
 * Product Badges Component
 * Shows various product states like "Best Seller", "House Special", etc.
 */
const ProductBadges = memo(({ 
  product, 
  style,
  showAll = true,
  maxBadges = 3,
  size = 'small' // 'small', 'medium', 'large'
}) => {
  if (!product) return null;

  const badges = [];

  // Priority order for badges
  if (product.agotado) {
    badges.push({
      key: 'agotado',
      text: 'Agotado',
      icon: 'times-circle',
      color: colors.text.light,
      backgroundColor: 'rgba(102, 102, 102, 0.1)',
      priority: 1
    });
  }

  if (product.enOferta && !product.agotado) {
    badges.push({
      key: 'oferta',
      text: 'En Oferta',
      icon: 'tag',
      color: colors.text.white,
      backgroundColor: colors.error,
      priority: 2
    });
  }

  if (product.descuento > 0 && !product.agotado) {
    badges.push({
      key: 'descuento',
      text: `${product.descuento}% OFF`,
      icon: 'percentage',
      color: colors.text.white,
      backgroundColor: colors.error,
      priority: 3
    });
  }

  if (product.masVendido && !product.agotado) {
    badges.push({
      key: 'masVendido',
      text: 'Más Vendido',
      icon: 'fire',
      color: colors.text.white,
      backgroundColor: colors.warning,
      priority: 4
    });
  }

  if (product.delaCasa && !product.agotado) {
    badges.push({
      key: 'delaCasa',
      text: 'De la Casa',
      icon: 'home',
      color: colors.text.white,
      backgroundColor: colors.success,
      priority: 5
    });
  }

  if (product.recomendado && !product.agotado) {
    badges.push({
      key: 'recomendado',
      text: 'Recomendado',
      icon: 'thumbs-up',
      color: colors.text.white,
      backgroundColor: colors.info,
      priority: 6
    });
  }

  if (product.rating >= 4 && !product.agotado) {
    badges.push({
      key: 'rating',
      text: `${product.rating}★`,
      icon: 'star',
      color: colors.text.white,
      backgroundColor: colors.accent,
      priority: 7
    });
  }

  // Sort by priority and limit
  const sortedBadges = badges
    .sort((a, b) => a.priority - b.priority)
    .slice(0, showAll ? badges.length : maxBadges);

  if (sortedBadges.length === 0) return null;

  const badgeSize = getBadgeSize(size);

  return (
    <View style={[styles.container, style]}>
      {sortedBadges.map((badge) => (
        <View
          key={badge.key}
          style={[
            styles.badge,
            badgeSize.container,
            { backgroundColor: badge.backgroundColor }
          ]}
        >
          <FontAwesome5
            name={badge.icon}
            size={badgeSize.iconSize}
            color={badge.color}
            style={styles.icon}
          />
          <Text
            style={[
              styles.text,
              badgeSize.text,
              { color: badge.color }
            ]}
            numberOfLines={1}
          >
            {badge.text}
          </Text>
        </View>
      ))}
    </View>
  );
});

// Helper function to get size configurations
const getBadgeSize = (size) => {
  switch (size) {
    case 'large':
      return {
        container: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
        text: { fontSize: typography.sizes.md },
        iconSize: 16
      };
    case 'medium':
      return {
        container: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
        text: { fontSize: typography.sizes.sm },
        iconSize: 14
      };
    case 'small':
    default:
      return {
        container: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
        text: { fontSize: typography.sizes.xs },
        iconSize: 10
      };
  }
};

// Display name for debugging
ProductBadges.displayName = 'ProductBadges';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borders.radius.round,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    ...theme.shadows.small,
  },
  
  icon: {
    marginRight: spacing.xs / 2,
  },
  
  text: {
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
});

export default ProductBadges;