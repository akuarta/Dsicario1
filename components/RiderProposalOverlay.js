import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform, Vibration
} from 'react-native';
import { useUser } from '../contexts/UserContext';
import { useCart } from '../contexts/AppContext';
import { fetchRiderOrders, respondToOffer } from '../utils/api';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

/**
 * RiderProposalOverlay
 * Se monta globalmente en App.js y detecta propuestas para el repartidor activo.
 * Muestra un modal con Aceptar / Rechazar por encima de cualquier pantalla.
 */
const RiderProposalOverlay = () => {
  const { role, userId } = useUser();
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { activeStaffMode } = useCart();

  const [proposal, setProposal] = useState(null); // La propuesta activa
  const [isResponding, setIsResponding] = useState(false);
  const [countdown, setCountdown] = useState(20);

  const pollRef      = useRef(null);
  const tickRef      = useRef(null);
  const seenIds      = useRef(new Set()); // IDs ya vistos, para no repetir el modal
  const proposalRef  = useRef(null); // Ref para evitar stale closure en el interval

  const roleLow = (role || '').toLowerCase();
  const isRiderByRole = roleLow.includes('delivery') || roleLow.includes('rider') || roleLow.includes('repartidor') || roleLow.includes('owner') || roleLow.includes('admin');
  const isRiderByMode = activeStaffMode === 'repartidor';
  const isRider = isRiderByRole || isRiderByMode;

  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 24,
      padding: 24,
      elevation: 30,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 20,
      backgroundColor: colors.surface
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 10,
    },
    emoji: { fontSize: 32 },
    title: { fontSize: 20, fontWeight: 'bold', flex: 1, color: colors.text.primary },
    badge: {
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    detail: {
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
      gap: 4,
      backgroundColor: colors.background
    },
    label: { fontSize: 12, marginTop: 8, color: colors.text.secondary },
    value: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
    valueHighlight: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
    buttons: {
      flexDirection: 'row',
      gap: 12,
    },
    btn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
    },
    rejectBtn: { backgroundColor: colors.error || '#FF3B30' },
    acceptBtn: { backgroundColor: colors.success || '#34C759' },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    itemsList: { backgroundColor: colors.background, padding: 10, borderRadius: 10, marginTop: 4 },
    itemsContent: { fontSize: 13, color: colors.text.secondary, fontStyle: 'italic' },
  }), [colors, darkMode]);

  // ─── Limpiar el modal de propuesta ─────────────────────────────────
  const dismissProposal = useCallback(() => {
    const current = proposalRef.current;
    if (current?.id) seenIds.current.add(current.id);
    proposalRef.current = null;
    setProposal(null);
    setCountdown(20);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  // ─── Responder al pedido ────────────────────────────────────────────
  const handleResponse = useCallback(async (accept) => {
    const current = proposalRef.current;
    if (!current || isResponding) return;
    setIsResponding(true);
    try {
      await respondToOffer(current.id, userId || current.riderId, accept);
      console.log(`[Overlay] Propuesta ${accept ? 'ACEPTADA ✅' : 'RECHAZADA ❌'}`);
    } catch (e) {
      console.error('[Overlay] Error respondiendo:', e.message);
    } finally {
      dismissProposal();
      setIsResponding(false);
    }
  }, [userId, isResponding, dismissProposal]);

  // ─── Polling global ─────────────────────────────────────────────────
  useEffect(() => {
    console.log('[Overlay] isRider:', isRider, '| role:', role, '| activeStaffMode:', activeStaffMode, '| userId:', userId);
    if (!isRider || !userId) return;

    // Usar userId directamente como riderId — no resolver contra fetchDeliveries
    // porque la tabla Deliverys puede tener un ID_Delivery diferente al userId (DS01)
    const riderIdResolved = userId;
    console.log('[Overlay] Usando riderId directo:', riderIdResolved);

    const poll = async () => {
      try {
        const orders = await fetchRiderOrders(riderIdResolved);
        const statuses = orders.map(o => o.estado);
        const proposalOrders = orders.filter(o => o.estado === 'proposal');
        console.log('[Overlay] Pedidos:', orders.length, '| Estados:', [...new Set(statuses)].join(','), '| Propuestas:', proposalOrders.length);

        if (proposalOrders.length > 0) {
          console.log('[Overlay] Propuestas encontradas:', proposalOrders.map(p => `${p.id} (riderId: ${p.riderId})`).join(', '));
        }

        const found = orders.find(o => {
          if (o.estado !== 'proposal') return false;
          if (seenIds.current.has(o.id)) return false;
          return true;
        });

        if (found && !proposalRef.current) {
          console.log('[Overlay] ✅ Propuesta detectada!', found.id);
          seenIds.current.add(found.id);
          proposalRef.current = found;
          setProposal(found);
    setCountdown(20);

          // Vibrar para llamar la atención (móvil)
          if (Platform.OS !== 'web') Vibration.vibrate([200, 100, 200]);

          // En web: notificación del navegador como alerta extra
          if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
            if (window.Notification.permission === 'granted') {
              new window.Notification('🛵 ¡Nuevo Pedido!', {
                body: `Abre la app para aceptar o rechazar.\nCliente: ${found.cliente} — Total: $${found.total}`,
                requireInteraction: true,
                tag: `proposal-${found.id}`,
              });
            }
          }
        }

        if (proposalRef.current && !proposalOrders.find(o => o.id === proposalRef.current.id)) {
          const goneOrder = proposalRef.current;
          dismissProposal();
          if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
            new window.Notification('Trato cancelado', {
              body: `El cliente canceló el pedido #${goneOrder.id}`,
              tag: `gone-${goneOrder.id}`,
            });
          }
          if (Platform.OS !== 'web') {
            const { ToastAndroid } = require('react-native');
            ToastAndroid.show(`Trato cancelado — Pedido #${goneOrder.id}`, ToastAndroid.LONG);
          }
        }
      } catch (e) { console.warn('[Overlay Poll]', e.message); }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isRider, userId, activeStaffMode]);

  // ─── Cuenta regresiva de la propuesta ───────────────────────────────
  useEffect(() => {
    if (!proposal) return;

    tickRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          dismissProposal(); // Tiempo agotado: cerrar modal automáticamente
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [proposal, dismissProposal]);

  if (!isRider || !proposal) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🛵</Text>
            <Text style={styles.title}>¡Nueva Solicitud!</Text>
            <View style={[styles.badge, { backgroundColor: countdown <= 5 ? colors.error : colors.warning }]}>
              <Text style={styles.badgeText}>{countdown}s</Text>
            </View>
          </View>

          {/* Detalles del pedido */}
          <View style={styles.detail}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{proposal.cliente}</Text>

            <Text style={styles.label}>Total</Text>
            <Text style={styles.valueHighlight}>
              ${parseFloat(proposal.total || 0).toFixed(2)}
            </Text>

            {proposal.direccion && (
              <>
                <Text style={styles.label}>Dirección</Text>
                <Text style={styles.value} numberOfLines={1}>{proposal.direccion.replace(/^[\d.-]+,[\d.-]+\s*\|\s*/, '')}</Text>
              </>
            )}

            {proposal.items && proposal.items.length > 0 && (
              <>
                <Text style={styles.label}>Pedido</Text>
                <View style={styles.itemsList}>
                   <Text style={styles.itemsContent} numberOfLines={2}>
                      {proposal.items.map(it => `${it.cantidad}x ${it.nombre}`).join(', ')}
                   </Text>
                </View>
              </>
            )}
          </View>

          {/* Botones */}
          {isResponding ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                onPress={() => handleResponse(false)}
              >
                <Text style={styles.btnText}>❌  Rechazar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.acceptBtn]}
                onPress={() => handleResponse(true)}
              >
                <Text style={styles.btnText}>✅  Aceptar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default RiderProposalOverlay;
