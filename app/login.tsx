import { token, users } from '@/constants/creds';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, TextInput, View } from 'react-native';




export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('')


  async function handleLogin() {
    // TODO: call backend auth API
    let admin = users[0];
    const cleanUrl = url.trim().replace(/\/+$/, ''); // makni razmake i trailing slash

    if (admin.name == email && admin.password == password && cleanUrl != "") {
      try {
        console.log("clean",cleanUrl)
        const response = await fetch(`${cleanUrl}/api/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
           throw new Error('Cannot reach Home Assistant');
        }

        await AsyncStorage.setItem('ha_url', cleanUrl);

        router.replace('/(tabs)');
      } catch (e) {
        console.error('Login failed:', e);
        const msg =
          'Ne mogu se spojiti na Home Assistant.\nProvjeri URL (npr. http://homeassistant.local:8123, bez / na kraju) i CORS postavke.';
        // Alert.alert ne radi na webu, pa fallback na window.alert
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(msg);
        } else {
          Alert.alert('Greška', msg);
        }
      }
    } else {
      setPassword('');
      setEmail('');
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, gap: 12 }}>
      <TextInput
        placeholder="Home assistant IP (http://localhost:8123)"
        placeholderTextColor="#888"
        value={url}
        onChangeText={setUrl}
        style={{ borderWidth: 1, padding: 10, backgroundColor: "#eee" }}
      />

      <TextInput
        placeholder="Username"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, backgroundColor: "#eee" }}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, backgroundColor: "#eee" }}
      />

      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
