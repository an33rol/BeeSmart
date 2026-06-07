import { View, TextInput, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Redirect } from 'expo-router';
import { users } from '@/constants/creds';
import { Colors } from '@/constants/theme';
import { token } from '@/constants/creds';
import AsyncStorage from '@react-native-async-storage/async-storage';




export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('')


  async function handleLogin() {
    // TODO: call backend auth API
    let admin = users[0];
    if (admin.name == email && admin.password == password && url != "") {
      
      await AsyncStorage.setItem('ha_url', url);
  
      const response = await fetch(`${url}/api/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error('Cannot reach Home Assistant');
      }
  
      const data = await response.json();
  
      console.log(data);

      router.replace('/(tabs)');
      
    }

    else {
      setPassword("")
      setEmail("")
    }

    console.log(email, password);


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