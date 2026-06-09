import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { token } from '@/constants/creds';

export const options = {
  headerShown: false,
};

type ChartData = {
  labels: string[];
  values: number[];
} | null; // null = nema podataka

const SENSORS = [
  {
    key: 'temperatura',
    title: 'Temperature (°C)',
    color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`, // žuta
  },
  {
    key: 'vlaga',
    title: 'Humidity (%)',
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // plava
  },
  {
    key: 'tezina',
    title: 'Weight (kg)',
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // zelena
  },
];

const MAX_POINTS = 40; // chart-kit uspori s previše točaka
const LABEL_COUNT = 5;

// HA history -> točke za graf, prorijeđeno na MAX_POINTS
function toChartData(history: any): ChartData {
  const entityHistory = Array.isArray(history) ? history[0] : null;
  if (!entityHistory || !entityHistory.length) return null;

  const points = entityHistory
    .map((item: any) => ({
      time: new Date(item.last_changed),
      value: parseFloat(item.state),
    }))
    .filter((p: any) => !isNaN(p.value));

  if (!points.length) return null;

  const step = Math.max(1, Math.ceil(points.length / MAX_POINTS));
  const sampled = points.filter((_: any, i: number) => i % step === 0);

  const labelEvery = Math.max(1, Math.floor(sampled.length / LABEL_COUNT));
  const labels = sampled.map((p: any, i: number) =>
    i % labelEvery === 0
      ? p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
  );

  return { labels, values: sampled.map((p: any) => p.value) };
}

export default function HiveAnalytics() {
  const { id } = useLocalSearchParams();

  const [url, setUrl] = useState('');
  const [chartWidth, setChartWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [charts, setCharts] = useState<Record<string, ChartData>>({});

  async function loadSettings() {
    const savedUrl = await AsyncStorage.getItem('ha_url');
    if (savedUrl) {
      setUrl(savedUrl);
    }
  }

  async function getHistory(sensorKey: string): Promise<ChartData> {
    try {
      const response = await fetch(
        `${url}/api/history/period?filter_entity_id=sensor.${id}_${sensorKey}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return null;

      return toChartData(await response.json());
    } catch (e) {
      console.error(`History fetch failed for ${sensorKey}:`, e);
      return null;
    }
  }

  async function loadData() {
    setLoading(true);

    const results = await Promise.all(
      SENSORS.map(async (s) => [s.key, await getHistory(s.key)] as const)
    );

    setCharts(Object.fromEntries(results));
    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!url) return;
    loadData();
  }, [url]);

  return (
    <ScrollView
      style={styles.container}
      onLayout={(event) => {
        setChartWidth(event.nativeEvent.layout.width - 75);
      }}
    >
      <ThemedText type="title">Hive {id} Analytics</ThemedText>

      {loading && <ActivityIndicator style={styles.loader} />}

      {!loading &&
        SENSORS.map((sensor) => {
          const data = charts[sensor.key];

          return (
            <ThemedView key={sensor.key} style={styles.card}>
              <ThemedText type="subtitle">{sensor.title}</ThemedText>

              {data && chartWidth > 0 ? (
                <LineChart
                  data={{
                    labels: data.labels,
                    datasets: [{ data: data.values }],
                  }}
                  width={chartWidth}
                  height={220}
                  withDots={false}
                  bezier
                  chartConfig={{
                    decimalPlaces: 1,
                    color: sensor.color,
                    labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                  }}
                />
              ) : (
                <ThemedText style={styles.noData}>
                  No data yet for this sensor.
                </ThemedText>
              )}
            </ThemedView>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  loader: {
    marginTop: 40,
  },

  card: {
    marginTop: 20,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },

  noData: {
    opacity: 0.6,
    paddingVertical: 24,
  },
});
