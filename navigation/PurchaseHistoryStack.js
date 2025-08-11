import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import PurchaseHistoryScreen from '../screens/PurchaseHistoryScreen';

const Stack = createStackNavigator();

const MenuButton = () => {
  const navigation = useNavigation();
  return (
    <FontAwesome5
      name="bars"
      size={22}
      color="#fff"
      style={{ marginLeft: 16, cursor: 'pointer' }}
      onPress={() => navigation.openDrawer()}
    />
  );
};

const PurchaseHistoryStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="PurchaseHistory"
      component={PurchaseHistoryScreen}
      options={{
        title: 'Historial de Compras',
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <MenuButton />,
      }}
    />
  </Stack.Navigator>
);

export default PurchaseHistoryStack;
