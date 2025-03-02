import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useBook } from '../../contexts/BookContext';
import { BookProcessor } from '../../services/BookProcessor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function BookScreen() {
  const { selectedBook, setSelectedBook } = useBook();
  const colorScheme = useColorScheme();
  const bookProcessor = new BookProcessor();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  React.useEffect(() => {
    // Run entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleBookCreation = async () => {
    if (!title) return;
    
    // Create a placeholder book with user input
    const content = `This is a placeholder content for "${title}" by ${author || 'Unknown'}`;
    
    const processedBook = await bookProcessor.processBook(content, {
      title: title,
      author: author,
      language: 'en',
      totalPages: Math.floor(Math.random() * 300) + 100, // Random page count for demo
    });
    
    // Animation for selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setSelectedBook(processedBook);
    });
  };

  const handleStartReading = () => {
    // Animation for transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => {
      router.push('/conversation');
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <Animated.View 
        style={[
          styles.card, 
          { 
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ] 
          }
        ]}
      >
        {!selectedBook ? (
          <>
            <View style={styles.headerContainer}>
              <Text style={styles.headerText}>Create Your Reading Session</Text>
              <Text style={styles.subHeaderText}>Enter book details to get started</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Book Title</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome name="book" size={20} color="#A0A0A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter book title"
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor="#A0A0A0"
                />
              </View>
              
              <Text style={styles.label}>Author (Optional)</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome name="user" size={20} color="#A0A0A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter author name"
                  value={author}
                  onChangeText={setAuthor}
                  placeholderTextColor="#A0A0A0"
                />
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.createButton} 
              onPress={handleBookCreation}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Create Book</Text>
              <FontAwesome name="arrow-right" size={16} color="white" style={styles.buttonIcon} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.bookHeader}>
              <FontAwesome name="bookmark" size={40} color="#4A6CF7" style={styles.bookIcon} />
              <Text style={styles.title}>{selectedBook.title}</Text>
              <Text style={styles.author}>by {selectedBook.author || 'Unknown Author'}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.bookDetails}>
              <View style={styles.detailItem}>
                <FontAwesome name="file-text" size={18} color="#4A6CF7" />
                <Text style={styles.detailText}>{selectedBook.metadata.totalPages} Pages</Text>
              </View>
              
              <View style={styles.detailItem}>
                <FontAwesome name="language" size={18} color="#4A6CF7" />
                <Text style={styles.detailText}>{selectedBook.metadata.wordCount} Words</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStartReading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Start Session</Text>
              <FontAwesome name="headphones" size={16} color="white" style={styles.buttonIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => setSelectedBook(null)}
            >
              <Text style={styles.resetText}>Select Different Book</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E8',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: '#4A6CF7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 12,
  },
  bookHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bookIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  author: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E8',
    marginVertical: 20,
  },
  bookDetails: {
    marginBottom: 30,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 12,
  },
  startButton: {
    backgroundColor: '#4A6CF7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resetButton: {
    padding: 12,
    alignItems: 'center',
  },
  resetText: {
    color: '#4A6CF7',
    fontSize: 16,
  },
});