import { useState } from 'react';
import { TextInput, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Button } from 'react-native';
export default function AddHiveScreen() {
  const [name, setName] = useState('');

  async function createHive() {
    if (!name.trim()) {
      Alert.alert('Name required');
      return;
    }

    // API call here

    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Add Hive</ThemedText>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Hive name"
      />

      <Button title="Create Hive" onPress={createHive} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },

  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
});