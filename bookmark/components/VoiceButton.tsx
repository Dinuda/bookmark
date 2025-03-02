import React, { useCallback } from 'react';
import { StyleSheet, Pressable, PressableProps } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import IconSymbol from './ui/IconSymbol';
import Colors from '../constants/Colors';
import * as Haptics from 'expo-haptics';

interface VoiceButtonProps extends PressableProps {
  isListening?: boolean;
  size?: number;
}

export function VoiceButton({ 
  isListening, 
  size = 24,
  style,
  onPress,
  ...props 
}: VoiceButtonProps) {
  const colorScheme = useColorScheme();

  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.({} as any);
  }, [onPress]);

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      style={[
        styles.button,
        isListening && styles.buttonActive,
        style,
      ]}
    >
      <IconSymbol
        name={isListening ? 'mic-fill' : 'mic'}
        size={size}
        color={isListening ? Colors[colorScheme].tint : Colors[colorScheme].text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonActive: {
    backgroundColor: '#F0F0F0'
  },
});