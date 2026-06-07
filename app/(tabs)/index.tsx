import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
// import { Button } from '@react-navigation/elements';
import { Button } from 'react-native';
import { token } from '@/constants/creds';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

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


function getTempColor(temp: number) {
  if (temp >= 35) return 'red';
  if (temp >= 30) return 'orange';
  return 'green';
}

function getHumidityColor(h: number) {
  if (h >= 75 || h <= 40) return 'orange'; // too dry or too humid
  return 'green';
}

function getWeightColor(w: number) {
  if (w < 20) return 'red';     // abnormal low
  if (w < 35) return 'orange';  // medium
  return 'green';               // healthy hive weight
}

function getLedColor(led: boolean) {
  return led ? 'green' : 'gray';
}

function getDoorColor(open: boolean) {
  return open ? 'orange' : 'green';
}

function getSmokeColor(smoke: boolean) {
  return smoke ? 'green' : 'gray';
}


function parseHives(states: any[]) {
  const hives: Record<string, any> = {};

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


// function removeHive(id: number) {
//   console.log("remove hive")
//   Alert.alert( // Alert doesnt work on web
//     'Remove Beehive',
//     'Are you sure you want to remove this beehive?',
//     [
//       {
//         text: 'Cancel',
//         style: 'cancel',
//       },
//       {
//         text: 'Remove',
//         style: 'destructive',
//         onPress: () => {
//           setHives((prev) => prev.filter((hive) => hive.id !== id));

//           // DELETE request to backend
//           // DELETE /hives/:id
//         },
//       },
//     ]
//   );
// }





export default function HomeScreen() {

  const [url, setUrl] = useState('')
  const [hives, setHives] = useState([]);
  const [selectedHive, setSelectedHive] = useState<number | null>(null);


// async function LEDAction(id: number) {
//   // POST req to Home Assistant

//   const entity_id = `switch.${id}_led`; // adjust to your HA naming

//   const response = await fetch(`${url}/api/services/switch/toggle`, {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${token}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       entity_id,
//     }),
//   });

//   const data = await response.json();
//   console.log('LED toggled:', data);
// }

async function Smoke(id: number) {
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

  function openAnalytics(id: number) {
    closeMenu();

    // navigate to analytics screen
    router.push(`/analytics/${id}`);

    console.log('Analytics for hive', id);
  }

  function openMenu(hiveId: number) {
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
    setHives(parseHives(states))
    console.log(hives)
    // for (let id in hiveIds){
    //   let elem = hiveIds[id]
      
    //   let sensors = states.filter((item) =>
    //     item.entity_id.includes(elem)
    //   );
    //   console.log(elem , sensors)
    // }

    return states;
  }
  useEffect(() => {
    loadSettings();
    loadData();
  }, []);

  async function loadData() {
    const states = await getStates();
    console.log(states);
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" >BeeSmart Dashboard</ThemedText>

        {/* <Button
            onPress={openAddHive}>
          + Add Hive
        </Button> */}


        <Button title="+ Add Hive" onPress={openAddHive} color="#333333" />
        {hives.map((hive) => (
          <ThemedView key={hive.id} style={styles.card}>
            {/* <ThemedText type="subtitle">{hive.name}</ThemedText> */}
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle">Hive {hive.id}</ThemedText>

              <TouchableOpacity
                style={styles.kebabButton}
                onPress={() => openMenu(hive.id)}
              >
                <ThemedText style={styles.kebabText}>⋮</ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedView style={styles.row}>
              <ThemedText>Temperature</ThemedText>
              <ThemedText style={{ color: getTempColor(hive.temperature) }}>{hive.temperature.toFixed(1)} °C</ThemedText>
            </ThemedView>

            <ThemedView style={styles.row}>
              <ThemedText>Humidity</ThemedText>
              <ThemedText style={{ color: getHumidityColor(hive.humidity) }}>
                {hive.humidity.toFixed(1)} %
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.row}>
              <ThemedText>Weight</ThemedText>
              <ThemedText style={{ color: getWeightColor(hive.weight) }}>
                {hive.weight.toFixed(1)} kg
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

            {/* <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                console.log("selected", selectedHive)

                if (selectedHive !== null) {
                  // removeHive(selectedHive);
                  closeMenu();
                }
              }}
            >
              <ThemedText style={styles.deleteText}>
                Remove Beehive
              </ThemedText>
            </TouchableOpacity> */}
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