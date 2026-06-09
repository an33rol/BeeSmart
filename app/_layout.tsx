import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AppState } from 'react-native';

function connect(){

}

function disconnect(){

}

export const unstable_settings = {
  initialRouteName: 'login',
  // anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    connect();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        connect();
      } else {
        disconnect();
      }
    });

    return () => {
      sub.remove();
      disconnect();
    };
  }, []);

  // useEffect(() => {
  //   // const inAuthGroup = segments[0] === '(auth)';

  //   // if (!isLoggedIn ) {
  //   //   router.replace('/login');
  //   // }

  //   if (isLoggedIn ) {
  //     router.replace('/(tabs)');
  //   }
  // }, [isLoggedIn]);


  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
      {/* <Stack.Screen name="(auth)" /> */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-hive" options={{ title: 'Add Hive' }} />
        {/* <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} /> */}
      </Stack>
      {/* <StatusBar style="auto" /> */}
    </ThemeProvider>
  );
}
