import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useBook } from '../../contexts/BookContext';
import { BookProcessor } from '../../services/BookProcessor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function BookScreen() {
  const { selectedBook, setSelectedBook } = useBook();
  const colorScheme = useColorScheme();
  const bookProcessor = new BookProcessor();

  const handleBookSelection = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        const response = await fetch(result.uri);
        const content = await response.text();
        
        const processedBook = await bookProcessor.processBook(content, {
          title: result.name,
          language: 'en',
        });

        setSelectedBook(processedBook);
      }
    } catch (error) {
      console.error('Error selecting book:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      {!selectedBook ? (
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} 
          onPress={handleBookSelection}
        >
          <Text style={styles.buttonText}>Select a Book</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.bookInfo}>
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
            {selectedBook.title}
          </Text>
          <Text style={[styles.author, { color: Colors[colorScheme ?? 'light'].text }]}>
            by {selectedBook.author}
          </Text>
          <Text style={[styles.metadata, { color: Colors[colorScheme ?? 'light'].text }]}>
            Pages: {selectedBook.metadata.totalPages}
            {'\n'}
            Words: {selectedBook.metadata.wordCount}
          </Text>
          <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
            onPress={() => {
              // Navigate to conversation screen
              // TODO: Implement navigation
            }}
          >
            <Text style={styles.buttonText}>Start Reading</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    width: '80%',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookInfo: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  author: {
    fontSize: 18,
    marginBottom: 16,
    opacity: 0.7,
  },
  metadata: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  startButton: {
    padding: 15,
    borderRadius: 8,
    width: '80%',
  },
});