import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { ConversationService } from '../../services/ConversationService';
import { VoiceService } from '../../services/VoiceService';
import { ConversationMessage } from '../../types/conversation';
import { Book } from '../../types/book';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Props {
  book: Book;
  onClose: () => void;
}

export default function ConversationScreen({ book, onClose }: Props) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const conversationService = new ConversationService();
  const voiceService = new VoiceService();

  useEffect(() => {
    const initSession = async () => {
      await conversationService.startSession(book.id);
      // Add a welcome message
      const welcomeMessage = {
        id: `welcome-${Date.now()}`,
        sessionId: 'initial',
        content: `Welcome to your reading session for "${book.title}". How can I help you understand or discuss this book?`,
        timestamp: new Date(),
        type: 'ai' as 'ai',
      };
      setMessages([welcomeMessage]);
    };
    initSession();

    return () => {
      voiceService.cleanup();
      conversationService.endSession();
    };
  }, [book.id]);

  // Animation for voice recording visualization
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation;
    let waveAnimation: Animated.CompositeAnimation;
    
    if (isListening || isProcessing) {
      setIsAnimating(true);
      
      // Create pulse animation
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      
      // Create wave animation
      waveAnimation = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        })
      );
      
      pulseAnimation.start();
      waveAnimation.start();
    } else {
      setIsAnimating(false);
    }
    
    return () => {
      if (pulseAnimation) pulseAnimation.stop();
      if (waveAnimation) waveAnimation.stop();
    };
  }, [isListening, isProcessing]);

  const handleVoiceInput = useCallback(async (text: string) => {
    try {
      // Add user message
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        sessionId: 'session',
        content: text,
        timestamp: new Date(),
        type: 'user',
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsProcessing(true);
      
      // Scroll to bottom after adding user message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Get relevant chunks from the book based on the query
      const relevantChunks = book.chunks.slice(0, 3);
      
      // Process message and get AI response
      const response = await conversationService.processUserMessage(text, relevantChunks);
      
      // Add AI response with typing effect
      setMessages(prev => [...prev, response]);
      
      // Scroll to bottom after adding AI response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // Speak the response
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <FontAwesome name="arrow-left" size={18} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{book.title}</Text>
          <Text style={styles.headerSubtitle}>Session with AI</Text>
        </View>
        <TouchableOpacity style={styles.notesButton}>
          <FontAwesome name="sticky-note" size={18} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.messageContainer}
        contentContainerStyle={styles.messageContent}
        ref={scrollViewRef}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.message,
              message.type === 'user' ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <View style={styles.messageHeader}>
              <FontAwesome 
                name={message.type === 'user' ? 'user' : 'robot'} 
                size={14} 
                color={message.type === 'user' ? '#FFF' : '#333'}
              />
              <Text 
                style={[
                  styles.messageRole,
                  message.type === 'user' ? styles.userRole : styles.aiRole,
                ]}
              >
                {message.type === 'user' ? 'You' : 'AI Assistant'}
              </Text>
            </View>
            <Text 
              style={[
                styles.messageText,
                message.type === 'user' ? styles.userMessageText : styles.aiMessageText,
              ]}
            >
              {message.content}
            </Text>
          </View>
        ))}
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <Text style={styles.processingText}>AI is processing...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.controls}>
        <View style={styles.voiceButtonContainer}>
          <Animated.View 
            style={[
              styles.voiceWave,
              { 
                opacity: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.2],
                }),
                transform: [
                  { scale: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.8],
                  })},
                ],
                display: isAnimating ? 'flex' : 'none',
              }
            ]}
          />
          <Animated.View 
            style={[
              styles.voiceWave,
              { 
                opacity: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.15],
                }),
                transform: [
                  { scale: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2.4],
                  })},
                ],
                display: isAnimating ? 'flex' : 'none',
              }
            ]}
          />
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isListening && styles.voiceButtonActive,
            ]}
            onPress={toggleListening}
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            <Animated.View 
              style={[
                styles.voiceButtonInner,
                { transform: [{ scale: isListening ? pulseAnim : 1 }] },
              ]}
            >
              <FontAwesome
                name={isListening ? 'stop' : 'microphone'}
                size={24}
                color="#FFF"
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.voiceHint}>
          {isListening 
            ? 'Listening...' 
            : isProcessing 
              ? 'Processing...' 
              : 'Tap to speak'}
        </Text>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  notesButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    flex: 1,
  },
  messageContent: {
    padding: 16,
    paddingBottom: 32,
  },
  message: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageRole: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  userRole: {
    color: '#FFF',
  },
  aiRole: {
    color: '#333',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A6CF7',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFF',
  },
  aiMessageText: {
    color: '#333',
  },
  processingIndicator: {
    alignSelf: 'center',
    marginVertical: 16,
    padding: 12,
    backgroundColor: 'rgba(74, 108, 247, 0.1)',
    borderRadius: 12,
  },
  processingText: {
    color: '#4A6CF7',
    fontSize: 14,
  },
  controls: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  voiceButtonContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  voiceButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A6CF7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  voiceButtonActive: {
    backgroundColor: '#FF3B30',
  },
  voiceButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceWave: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A6CF7',
    zIndex: 1,
  },
  voiceHint: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
});