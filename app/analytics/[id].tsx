import React, { useEffect } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {token} from '@/constants/creds';

const screenWidth = Dimensions.get('window').width;

const tempDataTest = [
  { time: "10:00", value: 32.1 },
  { time: "11:00", value: 33.0 },
  { time: "12:00", value: 33.8 },
  { time: "13:00", value: 34.2 },
  { time: "14:00", value: 35.0 },
  { time: "15:00", value: 34.6 },
  { time: "16:00", value: 33.9 },
];

export const options = {
  headerShown: false,
};

function formatHistory(data: any) {
  const entityHistory = data[0]; // first entity

  return entityHistory.map((point: any) => ({
    x: new Date(point.last_changed).getTime(),
    y: parseFloat(point.state),
  }));
}

export default function HiveAnalytics() {
  const [url, setUrl] = useState('')
  const { id } = useLocalSearchParams();
  const [tempData, setTempData] = useState();

  async function loadSettings() {
    const savedUrl = await AsyncStorage.getItem('ha_url');
  
    if (savedUrl) {
      setUrl(savedUrl);
    }
  
  }

  const [chartWidth, setChartWidth] = useState(0);

  const chartConfig = {
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
  };

  async function getTemperatureHistory() {
    console.log( `${url}/api/history/period?filter_entity_id=sensor.${id}_temperatura`)

    const response = await fetch(
      `${url}/api/history/period?filter_entity_id=sensor.${id}_temperatura`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  
    const data = await response.json();
  
    const chartData = data[0].map((item: any) => ({
      x: new Date(item.last_changed),
      y: parseFloat(item.state),
    }));
  
    return chartData;
  }

  async function getHumidityHistory() {
    const response = await fetch(
      `${url}/api/history/period?filter_entity_id=sensor.${id}_vlaga`,
      { 
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  
    const data = await response.json();
  
    const chartData = data[0].map((item: any) => ({
      x: new Date(item.last_changed),
      y: parseFloat(item.state),
    }));
  
    return chartData;
  }


  useEffect(()=>
  {
    loadSettings()
  },[]  )

  useEffect(() => {
    if (!url) return;
    loadData();
  }, [url]);


  async function loadData(){
    const data = await getTemperatureHistory();
    setTempData(data);
    console.log(data)
  }

  return (
    <ScrollView style={styles.container} onLayout={(event) => {
      setChartWidth(event.nativeEvent.layout.width - 75);
    }}> 
      <ThemedText type="title">
        Hive {id} Analytics
      </ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">
          Temperature (°C)
        </ThemedText>

        {tempData && <LineChart
          data={{
            labels: tempDataTest.map(p => p.time),
            datasets: [{ 
               data: tempDataTest.map(p => p.value)
            }],
          }}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          
        />}
      </ThemedView>

      {/* <ThemedView style={styles.card}>
        <ThemedText type="subtitle">
          Humidity (%)
        </ThemedText>

        <LineChart
          data={{
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ data: humidityHistory }],
          }}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          
        />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">
          Weight (kg)
        </ThemedText>

        <LineChart
          data={{
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ data: weightHistory }],
          }}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          
        />
      </ThemedView> */}

    
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  card: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  metric: {
    fontSize: 16,
    marginBottom: 8,
  },
});