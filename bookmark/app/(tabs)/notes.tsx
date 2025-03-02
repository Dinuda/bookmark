import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Note } from '@/types/conversation';
import { FontAwesome } from '@expo/vector-icons';
import { useBook } from '@/contexts/BookContext';

export default function NotesTab() {
  const colorScheme = useColorScheme();
  const { selectedBook } = useBook();
  const [notes, setNotes] = React.useState<Note[]>([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Mock data for demonstration
  useEffect(() => {
    if (selectedBook) {
      const mockNotes: Note[] = [
        {
          id: '1',
          sessionId: 'session1',
          bookId: selectedBook.id,
          content: 'The protagonist seems to be dealing with internal conflicts related to their past.',
          timestamp: new Date(),
          type: 'comment',
          tags: ['character', 'analysis']
        },
        {
          id: '2',
          sessionId: 'session1',
          bookId: selectedBook.id,
          content: '"In that moment, everything changed" - pivotal moment in the story.',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          type: 'highlight',
          context: 'Chapter 3',
        },
        {
          id: '3',
          sessionId: 'session1',
          bookId: selectedBook.id,
          content: 'Ephemeral: lasting for a very short time.',
          timestamp: new Date(Date.now() - 1000 * 60 * 10),
          type: 'vocabulary',
          context: 'The ephemeral nature of their relationship was apparent from the start.',
        }
      ];
      setNotes(mockNotes);
    }
    
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, [selectedBook]);

  const getNoteIcon = (type: string) => {
    switch (type) {
      case 'highlight': return 'quote-left';
      case 'comment': return 'comment';
      case 'vocabulary': return 'book';
      case 'summary': return 'file-text';
      default: return 'sticky-note';
    }
  };

  const getNoteColor = (type: string) => {
    switch (type) {
      case 'highlight': return '#4A6CF7';
      case 'comment': return '#34C759';
      case 'vocabulary': return '#FF9500';
      case 'summary': return '#5856D6';
      default: return '#8E8E93';
    }
  };

  const renderNote = ({ item, index }: { item: Note; index: number }) => {
    const staggeredDelay = index * 100;
    
    const itemFade = useRef(new Animated.Value(0)).current;
    const itemSlide = useRef(new Animated.Value(20)).current;
    
    useEffect(() => {
      Animated.parallel([
        Animated.timing(itemFade, {
          toValue: 1,
          duration: 500,
          delay: staggeredDelay,
          useNativeDriver: true,
        }),
        Animated.timing(itemSlide, {
          toValue: 0,
          duration: 500,
          delay: staggeredDelay,
          useNativeDriver: true,
        })
      ]).start();
    }, []);
    
    return (
      <Animated.View 
        style={[
          styles.noteCardContainer,
          { 
            opacity: itemFade,
            transform: [{ translateY: itemSlide }]
          }
        ]}
      >
        <View style={styles.noteCard}>
          <View style={[styles.noteIconContainer, { backgroundColor: getNoteColor(item.type) }]}>
            <FontAwesome name={getNoteIcon(item.type)} size={16} color="#FFF" />
          </View>
          
          <View style={styles.noteContent}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteType}>{item.type.toUpperCase()}</Text>
              <Text style={styles.noteTimestamp}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
            </View>
            
            <Text style={styles.noteText}>{item.content}</Text>
            
            {item.context && (
              <Text style={styles.noteContext}>{item.context}</Text>
            )}
            
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagContainer}>
                {item.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.emptyContainer, 
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <FontAwesome name="sticky-note-o" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No Notes Yet</Text>
      <Text style={styles.emptyText}>
        {selectedBook 
          ? "Start a session with your book to take notes" 
          : "Select a book to get started"}
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => {/* Navigate to the appropriate screen */}}
      >
        <Text style={styles.emptyButtonText}>
          {selectedBook ? "Start Session" : "Select Book"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#F8F8FC' }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Notes</Text>
        {selectedBook && (
          <Text style={styles.headerSubtitle}>{selectedBook.title}</Text>
        )}
      </View>
      
      {notes.length > 0 ? (
        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        renderEmptyState()
      )}
      
      {notes.length > 0 && (
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.fab}>
            <FontAwesome name="plus" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  noteCardContainer: {
    marginBottom: 16,
  },
  noteCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  noteIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noteContent: {
    flex: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  noteTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  noteText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    lineHeight: 22,
  },
  noteContext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F0F0F5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginTop: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: width * 0.8,
  },
  emptyButton: {
    backgroundColor: '#4A6CF7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A6CF7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});