import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, TextInput } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getConfig,
  getSeenCategories,
  setCategoryEnabled,
  setAllEnabled,
} from '../utils/logger';

const LoggerModal = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [config, setConfigState] = useState(getConfig());
  const [categories, setCategories] = useState(getSeenCategories());
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => {
    setConfigState(getConfig());
    setCategories(getSeenCategories());
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const toggleAll = (enabled) => {
    setAllEnabled(enabled);
    refresh();
  };

  const toggleCategory = (cat, enabled) => {
    setCategoryEnabled(cat, enabled);
    refresh();
  };

  const filteredCategories = search.trim()
    ? categories.filter(c => c.toLowerCase().includes(search.toLowerCase()))
    : categories;

  if (!visible || Platform.OS !== 'web') return null;

  const styles = makeStyles(colors);

  return (
    <View style={styles.overlay}>
      <View style={[styles.modal, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Control de Logs</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <FontAwesome5 name="times" size={18} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar categoría..."
          placeholderTextColor={colors.text.secondary}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.masterRow}>
          <Text style={styles.masterLabel}>
            <FontAwesome5 name="power-off" size={14} color={config['*'] ? colors.success : colors.text.secondary} />{' '}
            Logs {config['*'] ? 'ACTIVOS' : 'INACTIVOS'}
          </Text>
          <View style={styles.masterButtons}>
            <TouchableOpacity
              style={[styles.masterBtn, config['*'] && styles.masterBtnActive]}
              onPress={() => toggleAll(true)}
            >
              <Text style={[styles.masterBtnText, config['*'] && styles.masterBtnTextActive]}>Activar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.masterBtn, !config['*'] && styles.masterBtnInactive]}
              onPress={() => toggleAll(false)}
            >
              <Text style={[styles.masterBtnText, !config['*'] && styles.masterBtnTextInactive]}>Desactivar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>
            {categories.length} categorías • {Object.keys(config).filter(k => k !== '*' && config[k]).length} activas
          </Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
          {filteredCategories.length === 0 && (
            <Text style={styles.emptyText}>
              {search ? 'Sin resultados' : 'Carga la app para que aparezcan las categorías de logs'}
            </Text>
          )}
          {filteredCategories.map(cat => {
            const enabled = cat in config ? config[cat] : true;
            return (
              <View key={cat} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>[{cat}]</Text>
                  <View style={[styles.statusDot, { backgroundColor: enabled ? colors.success : colors.text.disabled }]} />
                </View>
                <TouchableOpacity
                  style={[styles.toggleBtn, enabled && styles.toggleBtnActive]}
                  onPress={() => toggleCategory(cat, !enabled)}
                >
                  <Text style={[styles.toggleBtnText, enabled && styles.toggleBtnTextActive]}>
                    {enabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: colors.surface || '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#eee',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  closeBtn: { padding: 8 },
  searchInput: {
    margin: 12,
    marginBottom: 4,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.background || '#f5f5f5',
    color: colors.text.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border || '#ddd',
  },
  masterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary + '12',
    marginHorizontal: 12,
    borderRadius: 10,
  },
  masterLabel: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary },
  masterButtons: { flexDirection: 'row', gap: 8 },
  masterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background || '#f5f5f5',
  },
  masterBtnActive: { backgroundColor: colors.success + '30' },
  masterBtnInactive: { backgroundColor: colors.error + '30' },
  masterBtnText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  masterBtnTextActive: { color: colors.success },
  masterBtnTextInactive: { color: colors.error },
  badgeRow: { paddingHorizontal: 16, paddingVertical: 6 },
  badgeText: { fontSize: 11, color: colors.text.secondary, textAlign: 'center' },
  list: { flex: 1, paddingHorizontal: 12 },
  emptyText: { textAlign: 'center', color: colors.text.secondary, padding: 30, fontSize: 13 },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#f0f0f0',
  },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  categoryName: { fontSize: 13, fontWeight: '600', color: colors.text.primary, fontFamily: 'monospace' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.background || '#f5f5f5',
  },
  toggleBtnActive: { backgroundColor: colors.success + '25' },
  toggleBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.text.secondary },
  toggleBtnTextActive: { color: colors.success },
});

export default LoggerModal;
