/**
 * Tab Navigator
 * Bottom tab navigation with Finder and Quran tabs
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import HomeScreen from '../screens/home/HomeScreen';
import QuranListScreen from '../screens/quran/QuranListScreen';

export type TabParamList = {
  Finder: undefined;
  Quran: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// HeroUI-inspired colors
const ACCENT_COLOR = '#3b82f6'; // Blue accent
const INACTIVE_COLOR = '#9ca3af'; // Gray
const BG_COLOR = '#ffffff';
const BORDER_COLOR = '#f3f4f6';

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACCENT_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: BG_COLOR,
          borderTopColor: BORDER_COLOR,
          borderTopWidth: 1,
          paddingTop: 10,
          paddingBottom: 10,
          height: 65,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = focused ? 26 : 24;
          const iconName = route.name === 'Finder' ? 'mic' : 'book';

          return (
            <View style={[
              styles.iconContainer,
              focused && styles.iconContainerActive
            ]}>
              <Ionicons name={iconName} size={iconSize} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Finder"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Finder',
        }}
      />
      <Tab.Screen
        name="Quran"
        component={QuranListScreen}
        options={{
          tabBarLabel: 'Quran',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 50,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: '#eff6ff', // Light blue background for active tab
  },
});

