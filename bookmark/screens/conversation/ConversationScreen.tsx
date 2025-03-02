import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ConversationService } from '../../services/ConversationService';
import { VoiceService } from '../../services/VoiceService';
import { ConversationMessage } from '../../types/conversation';
import { Book } from '../../types/book';

interface Props {
  book: Book;
  onClose: () => void;
}

export default function ConversationScreen({ book, onClose }: Props) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const conversationService = new ConversationService();
  const voiceService = new VoiceService();

  useEffect(() => {
    const initSession = async () => {
      await conversationService.startSession(book.id);
    };
    initSession();

    return () => {
      voiceService.cleanup();
      conversationService.endSession();
    };
  }, [book.id]);

  const handleVoiceInput = useCallback(async (text: string) => {
    setIsProcessing(true);
    try {
      // Get relevant chunks from the book based on the query
      const relevantChunks = book.chunks.slice(0, 3); // TODO: Implement proper retrieval
      
      const response = await conversationService.processUserMessage(text, relevantChunks);
      setMessages(prev => [...prev, response]);
      
      // Read the response aloud
      await voiceService.speak(response.content);
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [book]);

  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      await voiceService.stopListening();
    } else {
      setIsListening(true);
      await voiceService.startListening(handleVoiceInput);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messageContainer}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.message,
              message.type === 'user' ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}
        {isProcessing && (
          <ActivityIndicator size="large" color="#007AFF" />
        )}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.micButton,
            isListening && styles.micButtonActive,
          ]}
          onPress={toggleListening}
        >
          <Text style={styles.micButtonText}>
            {isListening ? 'Stop' : 'Start'} Listening
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>End Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  messageContainer: {
    flex: 1,
    padding: 16,
  },
  message: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9E9EB',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  controls: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  micButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
  },
  micButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#8E8E93',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
});