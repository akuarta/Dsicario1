import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { formatPrice } from '../utils/api';
import { borders, shadows, spacing, typography } from '../theme/theme';

const CartItem = ({
  item,
  isOpen,
  colors,
  onToggleNote,
  onConfirmNote,
  onClearNote,
  onIncrement,
  onDecrement,
  onRemove,
}) => {
  const [localNote, setLocalNote] = useState(item.orderNote || '');
  const hasNote = !!(item.orderNote && item.orderNote.trim());
  const itemId = item.cartItemId || String(item.id);

  // Sync local note when item.orderNote changes (e.g. from async storage load)
  useEffect(() => {
    setLocalNote(item.orderNote || '');
  }, [item.orderNote]);

  const handleConfirm = () => {
    onConfirmNote(itemId, localNote.trim());
  };

  const handleClear = () => {
    onClearNote(itemId);
  };

  // En móvil angosto (360dp) la fila cuádruple imagen+info+stepper+precio
  // no cabe: a la info le quedaban ~40px y el texto se rompía letra por letra.
  // En nativo: fila superior (imagen + info + papelera) y fila inferior
  // (stepper + subtotal). En web se conserva la fila única original.
  const isNarrowNative = Platform.OS !== 'web';

  const quantityStepper = (
    <View style={styles.quantityControls}>
      <TouchableOpacity style={[styles.quantityButton, { backgroundColor: colors.error }]} onPress={() => onDecrement(item)}>
        <FontAwesome5 name="minus" size={12} color="#FFF" />
      </TouchableOpacity>
      <Text style={[styles.quantityText, { color: colors.text.primary }]}>{item.quantity}</Text>
      <TouchableOpacity style={[styles.quantityButton, { backgroundColor: colors.primary }]} onPress={() => onIncrement(item)}>
        <FontAwesome5 name="plus" size={12} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const subtotalBlock = (
    <View style={styles.itemActions}>
      <Text style={[styles.subtotalText, { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{formatPrice(parseFloat(item.precio || 0) * item.quantity)}</Text>
      {!isNarrowNative && (
        <TouchableOpacity style={styles.removeButton} onPress={() => onRemove(item)}>
          <FontAwesome5 name="trash" size={14} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View>
      <View style={[styles.cartItem, { backgroundColor: colors.surface }]}>
        <Image source={{ uri: item.imagen }} style={[styles.itemImage, { backgroundColor: colors.background }]} resizeMode="cover" />
        <View style={styles.itemInfo}>
          {item.isPreOrder && (
            <View style={[styles.preOrderBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.preOrderText, { color: colors.primary }]}>Pre-Orden</Text>
            </View>
          )}
          <Text style={[styles.itemName, { color: colors.text.primary }]} numberOfLines={2}>{item.nombre}</Text>
          <Text style={[styles.itemCategory, { color: colors.text.light }]} numberOfLines={1}>{item.categoria}</Text>
          <Text style={[styles.itemPrice, { color: colors.text.secondary }]} numberOfLines={1}>{formatPrice(item.precio)} c/u</Text>
        </View>
        {isNarrowNative ? (
          <TouchableOpacity style={styles.removeButton} onPress={() => onRemove(item)}>
            <FontAwesome5 name="trash" size={14} color={colors.error} />
          </TouchableOpacity>
        ) : (
          <>
            {quantityStepper}
            {subtotalBlock}
          </>
        )}
      </View>
      {isNarrowNative && (
        <View style={[styles.cartItemFooter, { backgroundColor: colors.surface }]}>
          {quantityStepper}
          {subtotalBlock}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.noteRow, 
          { borderTopColor: colors.border },
          (hasNote || isOpen) && { borderTopColor: colors.primary + '44', backgroundColor: colors.primary + '0D' }
        ]}
        onPress={() => (isOpen || hasNote) ? handleClear() : onToggleNote(itemId)}
        activeOpacity={0.7}
      >
        <FontAwesome5 name="check" size={10} color={(hasNote || isOpen) ? colors.primary : colors.text.light} style={{ marginRight: 6 }} />
        <Text style={[
          styles.noteRowText, 
          { color: colors.text.light },
          (hasNote || isOpen) && { color: colors.primary, fontWeight: '500' }
        ]}>
          {hasNote ? `Nota: ${item.orderNote}` : isOpen ? 'Toca para cancelar nota' : 'Agregar nota para cocina'}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.noteInputContainer, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
          <FontAwesome5 name="utensils" size={12} color={colors.text.light} style={{ marginRight: 8, marginTop: 4 }} />
          <TextInput
            style={[styles.noteInput, { color: colors.text.primary }]}
            placeholder="Nota para cocina..."
            placeholderTextColor={colors.text.light}
            value={localNote}
            onChangeText={setLocalNote}
            autoFocus
            multiline
            numberOfLines={2}
            onSubmitEditing={handleConfirm}
            blurOnSubmit={true}
          />
          <TouchableOpacity style={[styles.noteConfirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirm}>
            <FontAwesome5 name="arrow-right" size={13} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    ...Platform.select({
      web: { borderRadius: borders.radius.lg },
      default: {
        borderTopLeftRadius: borders.radius.lg,
        borderTopRightRadius: borders.radius.lg,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        marginBottom: 0,
      },
    }),
    ...shadows.small,
  },
  // Segunda fila solo nativo: stepper + subtotal a lo ancho
  cartItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: 0,
    marginBottom: spacing.xs,
    borderBottomLeftRadius: borders.radius.lg,
    borderBottomRightRadius: borders.radius.lg,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: borders.radius.md,
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
    justifyContent: 'center',
  },
  preOrderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderWidth: 1,
  },
  preOrderText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
    flexShrink: 1,
  },
  itemCategory: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: typography.sizes.sm,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
    flexShrink: 0,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: borders.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginHorizontal: spacing.xs,
    minWidth: 20,
    textAlign: 'center',
  },
  itemActions: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: spacing.xs,
  },
  subtotalText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  removeButton: {
    padding: spacing.xs,
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borders.radius.md,
    borderLeftWidth: 3,
  },
  noteInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    minHeight: 36,
    textAlignVertical: 'top',
  },
  noteConfirmBtn: {
    width: 34,
    height: 34,
    borderRadius: borders.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  noteRowText: {
    fontSize: 12,
  },
});

// React.memo prevents re-rendering if props haven't changed!
export default React.memo(CartItem, (prevProps, nextProps) => {
  return (
    prevProps.item === nextProps.item &&
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.colors === nextProps.colors
  );
});
