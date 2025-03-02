import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useBook } from '@/contexts/BookContext';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LoadingScreen } from '@/components/LoadingScreen';
import { VoiceButton } from '@/components/VoiceButton';
import { ConversationService } from '@/services/ConversationService';
import { useVoiceInteraction } from '@/hooks/voice/useVoiceInteraction';

interface Message {
  text: string;
  isUser: boolean;
}

export default function ConversationTab() {
  const colorScheme = useColorScheme();
  const { selectedBook } = useBook();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { 
    isInitialized,
    isListening,
    error,
    initProgress,
    startListening,
    stopListening,
    speak 
  } = useVoiceInteraction();
  const [loadingText, setLoadingText] = useState('');

  useEffect(() => {
    const initServices = async () => {
      setLoadingText('Initializing services...');
      const conversationService = ConversationService.getInstance();
      await conversationService.initialize((progress) => {
        setLoadingText(`Loading models... ${Math.round(progress * 100)}%`);
      });
      setLoadingText('');
    };

    initServices();
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    try {
      setIsProcessing(true);
      const conversationService = ConversationService.getInstance();

      setMessages(prev => [...prev, { text, isUser: true }]);
      const response = await conversationService.processMessage(text);
      setMessages(prev => [...prev, { text: response, isUser: false }]);
      
      if (isInitialized) {
        await speak(response);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isInitialized, speak]);

  const handleVoiceInput = useCallback(
    (text: string) => handleSendMessage(text),
    [handleSendMessage]
  );

  const handlePressListen = useCallback(async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening(handleVoiceInput);
    }
  }, [isListening, startListening, stopListening, handleVoiceInput]);

  if (!selectedBook) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.selectBookText} onPress={() => router.push('/')}>
          Tap here to select a book first
        </ThemedText>
      </ThemedView>
    );
  }

  if (!isInitialized || loadingText) {
    return <LoadingScreen text={loadingText} progress={initProgress} />;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.messagesContainer}>
        {messages.map((message, index) => (
          <ThemedView
            key={index}
            style={[
              styles.messageContainer,
              message.isUser ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <ThemedText style={styles.messageText}>{message.text}</ThemedText>
          </ThemedView>
        ))}
        {isProcessing && (
          <ThemedView style={[styles.messageContainer, styles.aiMessage]}>
            <LoadingScreen />
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.inputContainer}>
        <VoiceButton 
          isListening={isListening}
          onPress={handlePressListen}
          size={24}
        />
      </ThemedView>

      {error && (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  selectBookText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  messagesContainer: {
    flex: 1,
  },
  messageContainer: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.tint,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.tabIconSelected,
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    padding: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});