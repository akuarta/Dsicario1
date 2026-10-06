import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors } from '../theme/theme';
import { CustomHeader } from '../components/CustomHeader';

/**
 * ChatListScreen — Bandeja de conversaciones por pedido.
 * Params: { myId, myName }
 * Ordena por updatedAt desc. Punto rojo si updatedAt > mi lastSeen.
 */
const ChatListScreen = ({ route, navigation }) => {
  const { myId, myName } = route.params || {};
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'order_chats'), orderBy('updatedAt', 'desc'), limit(30));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[ChatList] Error:', err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const isUnread = (chat) => {
    try {
      const seen = chat[`lastSeen_${String(myId)}`];
      const seenMs = seen?.toMillis ? seen.toMillis() : 0;
      const updMs = chat.updatedAt?.toMillis ? chat.updatedAt.toMillis() : 0;
      return updMs > seenMs;
    } catch (_) {
      return false;
    }
  };

  const fmtTime = (ts) => {
    try {
      const d = ts?.toDate ? ts.toDate() : null;
      if (!d) return '';
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      if (sameDay) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch (_) {
      return '';
    }
  };

  const openConversation = (chat) => {
    navigation.navigate('Chat', {
      orderId: chat.orderId || chat.id,
      peerName: chat.clientName || 'Cliente',
      myId,
      myName: myName || 'Repartidor',
      myRole: 'rider',
    });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: 14 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    info: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text.primary },
    orderTag: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginLeft: 8,
    },
    preview: { fontSize: 13, color: colors.text.secondary, marginTop: 3 },
    right: { alignItems: 'flex-end', marginLeft: 8 },
    time: { fontSize: 11, color: colors.text.light },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    emptyText: { color: colors.text.light, fontSize: 14, textAlign: 'center', marginTop: 12 },
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <CustomHeader title="Mensajes" showBack />
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => openConversation(item)} activeOpacity={0.7}>
              <View style={styles.avatar}>
                <FontAwesome5 name="user" size={18} color={colors.primary} />
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.clientName || 'Cliente'}
                  </Text>
                  {!!item.orderShort && <Text style={styles.orderTag}>#{item.orderShort}</Text>}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage || 'Sin mensajes'}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.time}>{fmtTime(item.updatedAt)}</Text>
                {isUnread(item) && <View style={styles.dot} />}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <FontAwesome5 name="comments" size={44} color={colors.text.light} />
              <Text style={styles.emptyText}>
                No hay conversaciones todavía.{'\n'}Toca el avión en un pedido para empezar una.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default ChatListScreen;
