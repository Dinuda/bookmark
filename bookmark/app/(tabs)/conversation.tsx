import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ConversationScreen from '@/screens/conversation/ConversationScreen';
import { useBook } from '@/contexts/BookContext';
import { router } from 'expo-router';

export default function ConversationTab() {
  const colorScheme = useColorScheme();
  const { selectedBook } = useBook();

  if (!selectedBook) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <Text 
          style={[styles.text, { color: Colors[colorScheme ?? 'light'].text }]}
          onPress={() => router.push('/')}
        >
          Tap here to select a book first
        </Text>
      </View>
    );
  }

  return <ConversationScreen book={selectedBook} onClose={() => router.push('/')} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});