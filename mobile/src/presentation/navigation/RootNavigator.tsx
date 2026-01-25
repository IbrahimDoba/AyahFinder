/**
 * Root Navigator
 * Main navigation structure
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ResultScreen from '../screens/result/ResultScreen';
import SurahScreen from '../screens/quran/SurahScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Result: undefined;
  Surah: {
    surahNumber: number;
    surahName: string;
    highlightAyah?: number;
    fromRecognition?: boolean;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Tabs"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Surah" component={SurahScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
