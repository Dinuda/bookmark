import React from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import Colors from '../constants/Colors';

interface LoadingScreenProps {
  text?: string;
  progress?: number;
}

export function LoadingScreen({ text, progress }: LoadingScreenProps) {
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color={Colors[colorScheme].text} />
      {text && <ThemedText style={styles.text}>{text}</ThemedText>}
      {progress != null && (
        <ThemedText style={styles.progressText}>
          {Math.round(progress * 100)}%
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
  },
});