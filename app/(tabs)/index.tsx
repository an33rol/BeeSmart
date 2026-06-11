import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { token } from '@/constants/creds';
import {
  Button, Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

const wsRef = useRef<WebSocket | null>(null);

type Hive = {
  id: string;
  name?: string;
  temperature: number | null;
  humidity: number | null;
  weight: number | null;
  led: boolean | null;
  open: boolean | null;
  smoke: boolean | null;
};

const hiveIds = ["k1", "k2"];
const initialHives = [
  {
    id: 1,
    name: 'Hive Alpha',
    temperature: 34.0,
    humidity: 68.2,
    weight: 43.2,
    led: true,
    open: false,
    smoke: false
  },
  {
    id: 2,
    name: 'Hive Beta',
    temperature: 24.0,
    humidity: 60.2,
    weight: 21.2,
    led: false,
    open: false,
    smoke: false
  },
];



function getTempColor(temp: number | null) {
  if (temp == null) return 'gray';
  if (temp >= 35) return 'red';
  if (temp >= 30) return 'orange';
  return 'green';
}

function getHumidityColor(h: number | null) {
  if (h == null) return 'gray';
  if (h >= 75 || h <= 40) return 'orange'; // too dry or too humid
  return 'green';
}

function getWeightColor(w: number | null) {
  if (w == null) return 'gray';
  if (w < 20) return 'red';     // abnormal low
  if (w < 35) return 'orange';  // medium
  return 'green';               // healthy hive weight
}

// "—" dok senzor još nema podataka (nova košnica)
function fmt(value: number | null, unit: string) {
  return value == null || isNaN(value) ? '—' : `${value.toFixed(1)} ${unit}`;
}

function getLedColor(led: boolean) {
  return led ? 'green' : 'gray';
}

function getDoorColor(open: boolean | null) {
  return open ? 'orange' : 'green';
}

function getSmokeColor(smoke: boolean | null) {
  return smoke ? 'green' : 'gray';
}


function parseHives(states: any[]): Hive[] {
  const hives: Record<string, Hive> = {};

  states.forEach((item) => {
    const idMatch = item.entity_id.match(/k\d+/);
    if (!idMatch) return;

    const hiveId = idMatch[0]; // "k1", "k2", etc.

    if (!hives[hiveId]) {
      hives[hiveId] = {
        id: hiveId,
        temperature: null,
        humidity: null,
        weight: null,
        led: null,
        open: null,
        smoke: null,
      };
    }

    if (item.entity_id.includes('temperatura')) {
      hives[hiveId].temperature = parseFloat(item.state);
    }

    if (item.entity_id.includes('vlaga')) {
      hives[hiveId].humidity = parseFloat(item.state);
    }

    if (item.entity_id.includes('tezina')) {
      hives[hiveId].weight = parseFloat(item.state);
    }

    if (item.entity_id.includes('zadimljivac')) {
      hives[hiveId].smoke = item.state === 'on';
    }

    if (item.entity_id.includes('poklopac')) {
      hives[hiveId].open = item.state === 'on';
    }

    if (item.entity_id.includes('led')) {
      hives[hiveId].led = item.state === 'on';
    }
  });

  return Object.values(hives);
}






export default function HomeScreen() {

  const [url, setUrl] = useState('')
  const [hives, setHives] = useState<Hive[]>([]);
  const [selectedHive, setSelectedHive] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const savedUrl = await AsyncStorage.getItem('ha_url');
  
      if (!savedUrl) return;
  
      setUrl(savedUrl);
  
      await loadData();
  
      connectWebSocket(savedUrl);
    }
  
    init();
  
    return () => {
      wsRef.current?.close();
    };
  }, []);

function connectWebSocket(haUrl: string) {
  if (!haUrl) return;

  const wsUrl = haUrl
    .replace(/^http/, 'ws')
    .replace(/\/$/, '') + '/api/websocket';

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WS connected');
  };

  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    console.log('WS:', msg);

    switch (msg.type) {
      case 'auth_required':
        ws.send(
          JSON.stringify({
            type: 'auth',
            access_token: token,
          })
        );
        break;

      case 'auth_ok':
        console.log('WS authenticated');

        ws.send(
          JSON.stringify({
            id: 1,
            type: 'subscribe_events',
            event_type: 'state_changed',
          })
        );

        await loadData();
        break;

      case 'event':
        handleStateChanged(msg.event);
        break;
    }
  };

  function handleStateChanged(event: any) {
    const entity = event.data?.new_state;
  
    if (!entity) return;
  
    setHives((prev) => {
      const next = [...prev];
  
      const hiveIdMatch = entity.entity_id.match(/k\d+/);
  
      if (!hiveIdMatch) return prev;
  
      const hiveId = hiveIdMatch[0];
  
      const index = next.findIndex((h) => h.id === hiveId);
  
      if (index === -1) return prev;
  
      const hive = { ...next[index] };
  
      if (entity.entity_id.includes('temperatura')) {
        hive.temperature = parseFloat(entity.state);
      }
  
      if (entity.entity_id.includes('vlaga')) {
        hive.humidity = parseFloat(entity.state);
      }
  
      if (entity.entity_id.includes('tezina')) {
        hive.weight = parseFloat(entity.state);
      }
  
      if (entity.entity_id.includes('poklopac')) {
        hive.open = entity.state === 'on';
      }
  
      if (entity.entity_id.includes('zadimljivac')) {
        hive.smoke = entity.state === 'on';
      }
  
      if (entity.entity_id.includes('led')) {
        hive.led = entity.state === 'on';
      }
  
      next[index] = hive;
  
      return next;
    });
  }

  ws.onerror = (err) => {
    console.log('WS error', err);
  };

  ws.onclose = () => {
    console.log('WS closed');

    setTimeout(() => {
      connectWebSocket(haUrl);
    }, 5000);
  };

  wsRef.current = ws;
}

async function Smoke(id: string) {
  const entity_id = `switch.${id}_zadimljivac`;

  const response = await fetch(`${url}/api/services/switch/toggle`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entity_id,
    }),
  });

  const data = await response.json();
  console.log('Smoke toggled:', data);
}

  function openAddHive() {
    // navigate to analytics screen
    router.push('/add-hive');

  }

  function openAnalytics(id: string) {
    closeMenu();

    // navigate to analytics screen
    router.push(`/analytics/${id}`);

    console.log('Analytics for hive', id);
  }

  function openMenu(hiveId: string) {
    setSelectedHive(hiveId);
  }

  function closeMenu() {
    setSelectedHive(null);
  }


  async function loadSettings() {
    const savedUrl = await AsyncStorage.getItem('ha_url');

    if (savedUrl) {
      setUrl(savedUrl);
    }

  }

  async function getStates() {
    const url = await AsyncStorage.getItem('ha_url');

    const response = await fetch(`${url}/api/states`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });


    let  states = await response.json();

    // imena košnica spremljena lokalno (Add Hive ekran)
    const raw = await AsyncStorage.getItem('hive_names');
    const names: Record<string, string> = raw ? JSON.parse(raw) : {};

    const parsed = parseHives(states).map((hive: any) => ({
      ...hive,
      name: names[hive.id] ?? `Hive ${hive.id}`,
    }));

    setHives(parsed);

    return states;
  }
  // osvježi podatke svaki put kad se ekran fokusira
  // (npr. povratak s Add Hive ekrana)
  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadData();
    }, [])
  );

  async function loadData() {
    const states = await getStates();
    console.log(states);
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" >BeeSmart Dashboard</ThemedText>

 


        <Button title="+ Add Hive" onPress={openAddHive} color="#333333" />
        {hives.map((hive) => (
          <ThemedView key={hive.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle">{hive.name}</ThemedText>

              <TouchableOpacity
                style={styles.kebabButton}
                onPress={() => openMenu(hive.id)}
              >
                <ThemedText style={styles.kebabText}>⋮</ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedView style={styles.row}>
              <ThemedText>Temperature</ThemedText>
              <ThemedText style={{ color: getTempColor(hive.temperature) }}>{fmt(hive.temperature, '°C')}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.row}>
              <ThemedText>Humidity</ThemedText>
              <ThemedText style={{ color: getHumidityColor(hive.humidity) }}>
                {fmt(hive.humidity, '%')}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.row}>
              <ThemedText>Weight</ThemedText>
              <ThemedText style={{ color: getWeightColor(hive.weight) }}>
                {fmt(hive.weight, 'kg')}
              </ThemedText>
            </ThemedView>
{/* 
            <ThemedView style={styles.row}>
              <ThemedText>LED</ThemedText>
              <ThemedText style={{ color: getLedColor(hive.led) }}>
                {hive.led ? 'ON' : 'OFF'}
              </ThemedText>
            </ThemedView>

            <Button title="LED Switch" onPress={() => LEDAction(hive.id)} /> */}

            <ThemedView style={styles.row}>
              <ThemedText>Hive Door</ThemedText>
              <ThemedText style={{ color: getDoorColor(hive.open) }}>
                {hive.open ? 'OPEN' : 'CLOSED'}
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.row}>
              <ThemedText>Smoke System</ThemedText>
              <ThemedText style={{ color: getSmokeColor(hive.smoke) }}>
                {hive.smoke ? 'ACTIVE' : 'OFF'}
              </ThemedText>
            </ThemedView>

            <Button title="Smoke System" onPress={() => Smoke(hive.id)} />

          </ThemedView>

        ))}
      </ScrollView>


      {/* KEBAB MENU MODAL */}
      <Modal
        visible={selectedHive !== null}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (selectedHive !== null) {
                  openAnalytics(selectedHive);
                }
              }}
            >
              <ThemedText>View Analytics</ThemedText>
            </TouchableOpacity>

          </View>
        </Pressable>
      </Modal>
    </>

  );
}


const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },

  card: {
    padding: 18,
    borderRadius: 20,
    gap: 12,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  kebabButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  kebabText: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  menu: {
    width: 240,
    backgroundColor: "black",
    borderRadius: 16,
    paddingVertical: 8,
    elevation: 8,
  },

  menuItem: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  deleteText: {
    color: 'red',
  },
});