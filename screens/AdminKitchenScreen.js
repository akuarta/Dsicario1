import { showAlert } from '../utils/showAlert';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { getThemeColors, spacing, typography, borders, shadows } from '../theme/theme';
import { fetchAllUsers, fetchKitchenOrders } from '../utils/api';
import { useUser } from '../contexts/UserContext';
import AccessDeniedScreen from '../components/AccessDeniedScreen';

const AdminKitchenScreen = ({ navigation }) => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  const { role } = useUser();
  const isAdmin = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'owner';

  if (!isAdmin) return <AccessDeniedScreen navigation={navigation} />;
  const [staff, setStaff] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allOrders] = await Promise.all([fetchAllUsers(), fetchKitchenOrders()]);
      const kitchenStaff = (allUsers || []).filter(u => {
        const role = (u.Rol || u.rol || u.UserType || u.usertype || u.role || '').toLowerCase();
        return role.includes('cocina') || role.includes('cocinero');
      });
      setStaff(kitchenStaff);
      setOrders(allOrders || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatsForStaff = useCallback((staffEmail) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const staffOrders = orders.filter(o => {
      const cookId = (o.id_cocinero || '').toLowerCase();
      return cookId === staffEmail.toLowerCase();
    });

    const isToday = (fecha) => {
      if (!fecha) return false;
      try {
        const parts = fecha.split(/[/\sT]/);
        const d = parts[0]?.padStart(2, '0');
        const m = parts[1]?.padStart(2, '0');
        const y = parts[2]?.substring(0, 4);
        return `${y}-${m}-${d}` === today;
      } catch { return false; }
    };

    const isThisWeek = (fecha) => {
      if (!fecha) return false;
      try {
        const parts = fecha.split(/[/\sT]/);
        const d = parts[0]?.padStart(2, '0');
        const m = parts[1]?.padStart(2, '0');
        const y = parts[2]?.substring(0, 4);
        const orderDate = new Date(`${y}-${m}-${d}`);
        return orderDate >= weekAgo;
      } catch { return false; }
    };

    const isThisMonth = (fecha) => {
      if (!fecha) return false;
      try {
        const parts = fecha.split(/[/\sT]/);
        const d = parts[0]?.padStart(2, '0');
        const m = parts[1]?.padStart(2, '0');
        const y = parts[2]?.substring(0, 4);
        const orderDate = new Date(`${y}-${m}-${d}`);
        return orderDate >= monthAgo;
      } catch { return false; }
    };

    const todayOrders = staffOrders.filter(o => isToday(o.fecha || o.Fecha));
    const weekOrders = staffOrders.filter(o => isThisWeek(o.fecha || o.Fecha));
    const monthOrders = staffOrders.filter(o => isThisMonth(o.fecha || o.Fecha));

    const getReadyTime = (o) => {
      if (!o.hora && !o.Fecha) return null;
      try {
        const hora = o.hora || o.Fecha;
        const parts = hora.split(/[/\sT]/);
        const d = parts[0]?.padStart(2, '0');
        const m = parts[1]?.padStart(2, '0');
        const y = parts[2]?.substring(0, 4);
        const timePart = parts[3] || '00:00:00';
        const orderTime = new Date(`${y}-${m}-${d}T${timePart}`);
        if (isNaN(orderTime.getTime())) return null;
        return Math.floor((new Date() - orderTime) / 60000);
      } catch { return null; }
    };

    return {
      today: todayOrders.length,
      week: weekOrders.length,
      month: monthOrders.length,
      total: staffOrders.length,
      avgTime: staffOrders.length > 0 ? Math.round(staffOrders.reduce((acc, o) => acc + (getReadyTime(o) || 0), 0) / staffOrders.length) : 0,
    };
  }, [orders]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: spacing.xl, alignItems: 'center', backgroundColor: colors.primary,
      borderBottomLeftRadius: 30, borderBottomRightRadius: 30, ...shadows.medium, marginBottom: spacing.lg,
    },
    backBtn: { position: 'absolute', top: spacing.xl, left: spacing.md, zIndex: 10, padding: 10 },
    headerIcon: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF',
      justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, ...shadows.small,
    },
    headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: '#FFFFFF' },
    headerSubtitle: { fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)' },
    periodRow: { flexDirection: 'row', paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: 8 },
    periodBtn: {
      flex: 1, paddingVertical: 8, borderRadius: borders.radius.md, alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    periodText: { fontSize: 12, fontWeight: 'bold', color: colors.text.secondary },
    periodTextActive: { color: '#FFFFFF' },
    listContent: { paddingHorizontal: spacing.md, paddingBottom: 100 },
    staffCard: {
      backgroundColor: colors.surface, borderRadius: borders.radius.lg, padding: spacing.md,
      marginBottom: spacing.sm, ...shadows.small,
    },
    staffHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    staffAvatar: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: '#E67E22' + '20',
      justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
    },
    staffName: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text.primary },
    staffRole: { fontSize: typography.sizes.sm, color: colors.text.secondary },
    statsRow: { flexDirection: 'row', gap: 8 },
    statBox: {
      flex: 1, backgroundColor: colors.background, borderRadius: borders.radius.md,
      padding: spacing.sm, alignItems: 'center',
    },
    statNumber: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.primary },
    statLabel: { fontSize: 10, color: colors.text.secondary, marginTop: 2 },
    emptyText: { textAlign: 'center', color: colors.text.secondary, marginTop: 60, fontSize: typography.sizes.md },
  }), [colors, darkMode]);

  const renderStaff = ({ item }) => {
    const stats = getStatsForStaff(item.Email || item.email || '');
    const periods = {
      today: stats.today,
      week: stats.week,
      month: stats.month,
    };

    return (
      <View style={styles.staffCard}>
        <View style={styles.staffHeader}>
          <View style={styles.staffAvatar}>
            <FontAwesome5 name="user" size={22} color="#E67E22" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.staffName}>{item.NombreUser || item.nombreuser || 'Sin nombre'}</Text>
            <Text style={styles.staffRole}>{item.Email || item.email || ''}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{periods[selectedPeriod]}</Text>
            <Text style={styles.statLabel}>{selectedPeriod === 'today' ? 'Hoy' : selectedPeriod === 'week' ? 'Semana' : 'Mes'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.avgTime}m</Text>
            <Text style={styles.statLabel}>Promedio</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <FontAwesome5 name="user" size={32} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Cocineros</Text>
        <Text style={styles.headerSubtitle}>{staff.length} cocineros registrados</Text>
      </View>

      <View style={styles.periodRow}>
        {[
          { key: 'today', label: 'Hoy' },
          { key: 'week', label: 'Semana' },
          { key: 'month', label: 'Mes' },
        ].map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, selectedPeriod === p.key && styles.periodBtnActive]}
            onPress={() => setSelectedPeriod(p.key)}
          >
            <Text style={[styles.periodText, selectedPeriod === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => String(item.ID || item.id)}
          renderItem={renderStaff}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay cocineros registrados</Text>}
        />
      )}
    </SafeAreaView>
  );
};

export default AdminKitchenScreen;
