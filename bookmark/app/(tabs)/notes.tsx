import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Note } from '@/types/conversation';

export default function NotesTab() {
  const colorScheme = useColorScheme();
  const [notes, setNotes] = React.useState<Note[]>([]);

  const renderNote = ({ item }: { item: Note }) => (
    <View style={[styles.noteCard, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <Text style={[styles.noteType, { color: Colors[colorScheme ?? 'light'].text }]}>
        {item.type.toUpperCase()}
      </Text>
      <Text style={[styles.noteContent, { color: Colors[colorScheme ?? 'light'].text }]}>
        {item.content}
      </Text>
      <Text style={[styles.noteTimestamp, { color: Colors[colorScheme ?? 'light'].text }]}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );

  if (notes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        <Text style={[styles.text, { color: Colors[colorScheme ?? 'light'].text }]}>
          No notes yet
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  noteCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noteType: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    opacity: 0.7,
  },
  noteContent: {
    fontSize: 16,
    marginBottom: 8,
  },
  noteTimestamp: {
    fontSize: 12,
    opacity: 0.5,
  },
});