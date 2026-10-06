import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { showAlert } from '../utils/showAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors } from '../theme/theme';
import { CustomHeader } from '../components/CustomHeader';

/**
 * Plantilla del mensaje rápido del repartidor. Marcadores: {cliente}, {rider}, {items}.
 */
export const RIDER_GREETING_KEY = '@dsicario_greeting_rider';
export const DEFAULT_RIDER_GREETING =
  '👋 Hola {cliente}, soy {rider} y llevo tu pedido: {items}.';

const fillGreeting = (template, { cliente, rider, items }) => {
  let out = String(template || DEFAULT_RIDER_GREETING);
  out = out.replace('{cliente}', cliente || 'gracias por tu compra');
  out = out.replace('{rider}', rider || 'tu repartidor');
  if (items && items.trim()) {
    out = out.replace('{items}', items.trim());
  } else {
    out = out.replace(/:\s*\{items\}/, '').replace('{items}', '');
  }
  return out;
};
/**
 * Abre el chat del pedido. Si aún no hay mensajes, manda primero el mensaje
 * rápido (plantilla personalizable del repartidor) y luego entra al chat.
 *
 * openChat(navigation, { orderId, peerName, myId, myName, myRole, itemsSummary })
 */
export const openChat = async (navigation, params) => {
  const { orderId, peerName, myId, myName, myRole, itemsSummary } = params || {};
  const chatId = String(orderId || '');
  if (!chatId) return;
  try {
    const snap = await getDocs(
      query(collection(db, 'order_chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(1))
    );
    if (snap.empty) {
      // Al cliente le importa QUÉ pidió, no el número de pedido.
      const items = String(itemsSummary || '').trim();
      let greeting;
      if (myRole === 'rider') {
        let template = DEFAULT_RIDER_GREETING;
        try {
          const saved = await AsyncStorage.getItem(RIDER_GREETING_KEY);
          if (saved && saved.trim()) template = saved;
        } catch (_) {}
        greeting = fillGreeting(template, {
          cliente: peerName,
          rider: myName,
          items,
        });
      } else {
        greeting = `👋 Hola, soy ${myName || 'el cliente'}. Tengo una consulta sobre mi pedido.`;
      }
      await setDoc(
        doc(db, 'order_chats', chatId),
        {
          orderId: chatId,
          updatedAt: serverTimestamp(),
          lastMessage: greeting.slice(0, 120),
          participants: [String(myId || 'anon'), String(peerName || 'peer')],
          // Para la bandeja: quién es quién y referencia corta del pedido.
          ...(myRole === 'rider'
            ? { riderName: String(myName || ''), clientName: String(peerName || '') }
            : { riderName: String(peerName || ''), clientName: String(myName || '') }),
          orderShort: chatId.slice(-4),
        },
        { merge: true }
      );
      await addDoc(collection(db, 'order_chats', chatId, 'messages'), {
        text: greeting,
        senderId: String(myId || 'anon'),
        senderName: String(myName || 'Usuario'),
        senderRole: String(myRole || 'cliente'),
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error('[Chat] No se pudo mandar el saludo inicial:', err);
  }
  navigation.navigate('Chat', { orderId, peerName, myId, myName, myRole });
};
const ChatScreen = ({ route }) => {
  const { orderId, peerName, myId, myName, myRole } = route.params || {};
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatRef = useRef(null);

  const chatId = String(orderId || 'general');

  // Marcar como leído al entrar (para el punto de no leído de la bandeja).
  useEffect(() => {
    if (!orderId || !myId) return;
    setDoc(
      doc(db, 'order_chats', chatId),
      { [`lastSeen_${String(myId)}`]: serverTimestamp() },
      { merge: true }
    ).catch((err) => console.error('[Chat] Error marcando leído:', err));
  }, [chatId, orderId, myId]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'order_chats', chatId, 'messages'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[Chat] Error escuchando mensajes:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, [chatId, orderId]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !orderId) return;
    setSending(true);
    setDraft('');
    try {
      await setDoc(
        doc(db, 'order_chats', chatId),
        {
          orderId: String(orderId),
          updatedAt: serverTimestamp(),
          lastMessage: text.slice(0, 120),
          participants: [String(myId || 'anon'), String(peerName || 'peer')],
        },
        { merge: true }
      );
      await addDoc(collection(db, 'order_chats', chatId, 'messages'), {
        text,
        senderId: String(myId || 'anon'),
        senderName: String(myName || 'Usuario'),
        senderRole: String(myRole || 'cliente'),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[Chat] Error enviando:', err);
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : null;
      if (!d) return '';
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (_) {
      return '';
    }
  };

  const handleDelete = (msg) => {
    showAlert('Eliminar mensaje', '¿Borrar este mensaje para todos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'order_chats', chatId, 'messages', msg.id));
          } catch (err) {
            console.error('[Chat] Error borrando:', err);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const mine = String(item.senderId) === String(myId);
    const bubble = (
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        ]}
      >
        {!mine && (
          <Text style={[styles.sender, { color: colors.primary }]} numberOfLines={1}>
            {item.senderName || 'Usuario'}
          </Text>
        )}
        <Text style={[styles.text, { color: mine ? '#FFF' : colors.text.primary }]}>
          {item.text}
        </Text>
        <Text style={[styles.time, { color: mine ? 'rgba(255,255,255,0.7)' : colors.text.light }]}>
          {fmtTime(item.createdAt)}
        </Text>
      </View>
    );
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
        {mine ? (
          <TouchableOpacity activeOpacity={0.8} onLongPress={() => handleDelete(item)}>
            {bubble}
          </TouchableOpacity>
        ) : (
          bubble
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { paddingHorizontal: 14, paddingVertical: 10 },
    row: { flexDirection: 'row', marginVertical: 3 },
    rowMine: { justifyContent: 'flex-end' },
    rowTheirs: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
    sender: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
    text: { fontSize: 15, lineHeight: 20 },
    time: { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    emptyText: { color: colors.text.light, fontSize: 14, textAlign: 'center', marginTop: 12 },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
      fontSize: 15,
      color: colors.text.primary,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 100,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <CustomHeader title={peerName ? `Chat · ${peerName}` : 'Chat del pedido'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <FontAwesome5 name="comments" size={44} color={colors.text.light} />
                <Text style={styles.emptyText}>
                  Aún no hay mensajes.{'\n'}Escribe el primero para coordinar la entrega.
                </Text>
              </View>
            }
          />
        )}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.text.light}
            value={draft}
            onChangeText={setDraft}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { opacity: draft.trim() && !sending ? 1 : 0.5 }]}
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <FontAwesome5 name="paper-plane" size={16} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
