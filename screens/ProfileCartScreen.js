import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const ProfileCartScreen = ({ navigation }) => (
  <SafeAreaView style={styles.container}>
    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
      <FontAwesome5 name="arrow-left" size={20} color="#FF6B35" />
      <Text style={styles.backText}>Atrás</Text>
    </TouchableOpacity>
    <View style={styles.content}>
      <Text style={styles.title}>Mi Carrito</Text>
      <Text style={styles.text}>Aquí se mostrarán los productos de tu carrito desde el perfil.</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backText: {
    marginLeft: 8,
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#FF6B35',
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
});

export default ProfileCartScreen;
