import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

/**
 * RatingBadge — Reusable star rating display
 * Shows stars, numeric rating, and optional level badge
 *
 * Props:
 *   rating      - number (0-5)
 *   count       - number of ratings
 *   size        - 'small' | 'medium' | 'large'
 *   showLevel   - boolean, show level badge
 *   nivel       - string, level name
 *   nivelColor  - string, level badge color
 *   style       - additional container style
 */
const RatingBadge = ({
  rating = 0,
  count = 0,
  size = 'medium',
  showLevel = false,
  nivel = '',
  nivelColor = '#999',
  style,
}) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const s = size === 'small' ? 10 : size === 'large' ? 18 : 14;
  const fontSize = size === 'small' ? 11 : size === 'large' ? 20 : 14;
  const countSize = size === 'small' ? 9 : size === 'large' ? 13 : 11;

  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {Array.from({ length: fullStars }, (_, i) => (
          <FontAwesome5 key={`f${i}`} name="star" size={s} color={colors.warning} solid />
        ))}
        {hasHalf && (
          <FontAwesome5 key="h" name="star-half-alt" size={s} color={colors.warning} solid />
        )}
        {Array.from({ length: emptyStars }, (_, i) => (
          <FontAwesome5 key={`e${i}`} name="star" size={s} color={colors.text?.disabled || '#CCC'} />
        ))}
        <Text style={[styles.ratingText, { color: colors.text?.primary || '#333', fontSize }]}>
          {rating > 0 ? rating.toFixed(1) : '—'}
        </Text>
      </View>
      {count > 0 && (
        <Text style={[styles.countText, { color: colors.text?.light || '#999', fontSize: countSize }]}>
          {count} {count === 1 ? 'valoración' : 'valoraciones'}
        </Text>
      )}
      {showLevel && nivel ? (
        <View style={[styles.levelBadge, { backgroundColor: nivelColor + '20' }]}>
          <Text style={[styles.levelText, { color: nivelColor, fontSize: countSize }]}>{nivel}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { marginLeft: 6, fontWeight: 'bold' },
  countText: { marginTop: 2 },
  levelBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  levelText: { fontWeight: 'bold' },
});

export default RatingBadge;
