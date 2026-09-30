import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, Platform, Vibration
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
import { submitOrderRating, fetchUserRatings, recalculateUserRatings, calculateTrustScore } from '../utils/api';

/**
 * RatingModal — Post-delivery rating screen
 * Shows after an order is delivered. Client rates the rider/waiter.
 *
 * Props:
 *   visible       - boolean
 *   pedidoId      - order ID
 *   paraUsuario   - ID of the user being rated (rider/waiter)
 *   paraNombre    - display name of the person being rated
 *   tipoPedido    - 'delivery' | 'local'
 *   onRated       - callback after successful rating
 *   onSkip        - callback when user skips
 */
const RatingModal = ({
  visible = false,
  pedidoId = '',
  paraUsuario = '',
  paraNombre = 'Empleado',
  tipoPedido = 'delivery',
  onRated,
  onSkip,
}) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Load the rated user's profile when modal opens
  useEffect(() => {
    if (!visible || !paraUsuario) return;
    setEstrellas(0);
    setComentario('');
    setEnviando(false);

    fetchUserRatings(paraUsuario).then(data => {
      setProfileData(data);
    }).catch(() => {});
  }, [visible, paraUsuario]);

  const handleRate = useCallback(async (rating) => {
    if (enviando) return;
    setEnviando(true);

    const finalRating = rating || 4.0;
    const isAutomatica = rating === 0;

    try {
      const result = await submitOrderRating({
        pedidoId,
        deUsuario: '', // Will be filled by the caller (current user)
        paraUsuario,
        estrellas: finalRating,
        comentario: isAutomatica ? '' : comentario.trim(),
        automatica: isAutomatica,
        tipoCalificacion: tipoPedido === 'delivery' ? 'servicio' : 'servicio',
      });

      if (result.success) {
        // Background: recalculate user's ratings
        recalculateUserRatings(paraUsuario).catch(() => {});
      }

      if (Platform.OS !== 'web') Vibration.vibrate(100);
      onRated?.({ estrellas: finalRating, automatica: isAutomatica });
    } catch (e) {
      console.error('[Rating] Error:', e);
    } finally {
      setEnviando(false);
    }
  }, [enviando, pedidoId, paraUsuario, comentario, tipoPedido, onRated]);

  const handleSkip = useCallback(() => {
    // Auto-rate with 4.0
    handleRate(0);
  }, [handleRate]);

  const promedio = profileData?.promedio || 0;
  const cantidad = profileData?.cantidad || 0;
  const trustScore = calculateTrustScore({
    promedio: promedio || 4.5,
    cantidad,
    pedidosCompletados: Math.max(cantidad, 10),
    tasaAceptacion: 95,
  });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface || '#FFF' }]}>
          {/* Header */}
          <View style={styles.header}>
            <FontAwesome5
              name={tipoPedido === 'delivery' ? 'motorcycle' : 'utensils'}
              size={28}
              color={colors.primary}
            />
            <Text style={[styles.completedText, { color: colors.text?.primary || '#333' }]}>
              Pedido Completado
            </Text>
          </View>

          {/* Profile */}
          <View style={styles.profileSection}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {paraNombre.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.name, { color: colors.text?.primary || '#333' }]}>{paraNombre}</Text>

            {/* Existing rating */}
            {promedio > 0 && (
              <View style={styles.existingRating}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <FontAwesome5
                      key={i}
                      name="star"
                      size={12}
                      color={i <= Math.round(promedio) ? colors.warning : (colors.text?.disabled || '#CCC')}
                      solid={i <= Math.round(promedio)}
                    />
                  ))}
                  <Text style={[styles.existingScore, { color: colors.text?.secondary || '#666' }]}>
                    {promedio.toFixed(1)}
                  </Text>
                </View>
                <Text style={[styles.trustInfo, { color: colors.text?.light || '#999' }]}>
                  {cantidad} valoraciones · Nivel {trustScore.nivel}
                </Text>
              </View>
            )}
          </View>

          {/* Rate section */}
          <Text style={[styles.promptText, { color: colors.text?.secondary || '#666' }]}>
            ¿Cómo fue tu experiencia?
          </Text>

          {/* Star selector */}
          <View style={styles.starSelector}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity
                key={i}
                onPress={() => setEstrellas(i)}
                style={styles.starBtn}
                activeOpacity={0.7}
              >
                <FontAwesome5
                  name="star"
                  size={32}
                  color={i <= estrellas ? colors.warning : (colors.text?.disabled || '#DDD')}
                  solid={i <= estrellas}
                />
              </TouchableOpacity>
            ))}
          </View>

          {estrellas > 0 && (
            <Text style={[styles.ratingLabel, { color: colors.warning }]}>
              {estrellas === 5 ? 'Excelente' :
               estrellas === 4 ? 'Bueno' :
               estrellas === 3 ? 'Regular' :
               estrellas === 2 ? 'Malo' : 'Muy malo'}
            </Text>
          )}

          {/* Comment */}
          <TextInput
            style={[styles.commentInput, {
              color: colors.text?.primary || '#333',
              backgroundColor: colors.background || '#F5F5F5',
              borderColor: colors.border || '#DDD',
            }]}
            placeholder="Escribe un comentario (opcional)"
            placeholderTextColor={colors.text?.light || '#999'}
            value={comentario}
            onChangeText={setComentario}
            multiline
            maxLength={280}
          />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.rateBtn, {
                backgroundColor: estrellas > 0 ? colors.primary : (colors.text?.disabled || '#CCC'),
                opacity: enviando ? 0.6 : 1,
              }]}
              onPress={() => handleRate(estrellas)}
              disabled={enviando || estrellas === 0}
              activeOpacity={0.8}
            >
              {enviando ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.rateBtnText}>Valorar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={enviando}
              activeOpacity={0.8}
            >
              <Text style={[styles.skipBtnText, { color: colors.text?.light || '#999' }]}>
                Omitir
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: { alignItems: 'center', marginBottom: 16 },
  completedText: { fontSize: 18, fontWeight: 'bold', marginTop: 8 },

  profileSection: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 26, fontWeight: 'bold' },
  name: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  existingRating: { alignItems: 'center' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  existingScore: { marginLeft: 6, fontWeight: 'bold', fontSize: 13 },
  trustInfo: { fontSize: 11, marginTop: 2 },

  promptText: { fontSize: 14, marginBottom: 12 },

  starSelector: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  starBtn: { padding: 4 },

  ratingLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 14 },

  commentInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  buttonRow: { width: '100%', gap: 10 },
  rateBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rateBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  skipBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipBtnText: { fontSize: 14 },
});

export default RatingModal;
