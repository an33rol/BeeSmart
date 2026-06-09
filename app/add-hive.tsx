import { useState } from 'react';
import { TextInput, StyleSheet, Alert, Button, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { token } from '@/constants/creds';

function notify(title: string, msg: string) {
  // Alert.alert ne radi na webu
  if (typeof window !== 'undefined' && window.alert) {
    window.alert(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

export default function AddHiveScreen() {
  const [name, setName] = useState('');
  const [hiveNumber, setHiveNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Kreira entitete u Home Assistantu preko MQTT Discoveryja:
  // objavi retained config poruku na homeassistant/<tip>/<object_id>/config
  // i HA sam registrira entitet. Koristimo HA REST servis mqtt.publish,
  // pa nikakva promjena u configuration.yaml nije potrebna.
  async function publishDiscovery(url: string, num: string) {
    const id = `k${num}`;
    const baseTopic = `beesmart/koshnica${num}`;

    const entities: [string, string, Record<string, unknown>][] = [
      [
        'sensor',
        `${id}_temperatura`,
        {
          name: `K${num} Temperatura`,
          state_topic: `${baseTopic}/temperatura`,
          unit_of_measurement: '°C',
          device_class: 'temperature',
          icon: 'mdi:thermometer',
        },
      ],
      [
        'sensor',
        `${id}_vlaga`,
        {
          name: `K${num} Vlaga`,
          state_topic: `${baseTopic}/vlaga`,
          unit_of_measurement: '%',
          device_class: 'humidity',
          icon: 'mdi:water-percent',
        },
      ],
      [
        'sensor',
        `${id}_tezina`,
        {
          name: `K${num} Težina`,
          state_topic: `${baseTopic}/tezina`,
          unit_of_measurement: 'kg',
          icon: 'mdi:scale',
        },
      ],
      [
        'binary_sensor',
        `${id}_poklopac`,
        {
          name: `K${num} Poklopac`,
          state_topic: `${baseTopic}/poklopac`,
          payload_on: 'OPEN',
          payload_off: 'CLOSED',
          device_class: 'door',
          icon: 'mdi:beehive-outline',
        },
      ],
      [
        'switch',
        `${id}_zadimljivac`,
        {
          name: `K${num} Zadimljivač`,
          command_topic: `${baseTopic}/humidifier/set`,
          state_topic: `${baseTopic}/humidifier/state`,
          payload_on: 'ON',
          payload_off: 'OFF',
          icon: 'mdi:smoke',
        },
      ],
    ];

    for (const [component, objectId, config] of entities) {
      const response = await fetch(`${url}/api/services/mqtt/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: `homeassistant/${component}/${objectId}/config`,
          retain: true,
          payload: JSON.stringify({
            ...config,
            unique_id: objectId,
            object_id: objectId, // garantira entity_id npr. sensor.k3_temperatura
          }),
        }),
      });

      if (!response.ok) {
        throw new Error(`Home Assistant returned ${response.status}`);
      }
    }
  }

  async function createHive() {
    const num = hiveNumber.trim();

    if (!/^\d+$/.test(num)) {
      notify('Greška', 'Unesi broj košnice (npr. 3).');
      return;
    }
    if (!name.trim()) {
      notify('Greška', 'Unesi ime košnice.');
      return;
    }

    const url = await AsyncStorage.getItem('ha_url');
    if (!url) {
      notify('Greška', 'Nema spremljenog Home Assistant URL-a. Prijavi se ponovno.');
      return;
    }

    setSaving(true);
    try {
      // 1) kreiraj entitete u HA
      await publishDiscovery(url, num);

      // 2) spremi ime košnice lokalno (id -> ime)
      const raw = await AsyncStorage.getItem('hive_names');
      const names: Record<string, string> = raw ? JSON.parse(raw) : {};
      names[`k${num}`] = name.trim();
      await AsyncStorage.setItem('hive_names', JSON.stringify(names));

      router.back();
    } catch (e) {
      console.error('createHive failed:', e);
      notify(
        'Greška',
        'Ne mogu kreirati košnicu u Home Assistantu. Provjeri vezu i da je MQTT integracija aktivna.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Add Hive</ThemedText>

      <TextInput
        style={styles.input}
        value={hiveNumber}
        onChangeText={setHiveNumber}
        placeholder="Hive number (e.g. 3)"
        placeholderTextColor="#888"
        keyboardType="numeric"
      />

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Hive name"
        placeholderTextColor="#888"
      />

      <ThemedText style={styles.hint}>
        Senzori (temperatura, vlaga, težina, poklopac, zadimljivač) kreiraju se
        automatski u Home Assistantu. Uređaj treba slati podatke na
        beesmart/koshnica&lt;broj&gt;/... topice.
      </ThemedText>

      {saving ? (
        <ActivityIndicator />
      ) : (
        <Button title="Create Hive" onPress={createHive} />
      )}
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
    backgroundColor: '#eee',
  },

  hint: {
    fontSize: 13,
    opacity: 0.7,
  },
});
