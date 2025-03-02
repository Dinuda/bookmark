import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Recording } from 'expo-av/build/Audio/Recording';

export class VoiceService {
  private isListening: boolean = false;
  private recording: Recording | null = null;
  private onTranscriptionCallback: ((text: string) => void) | null = null;

  constructor() {
    this.setupAudio();
  }

  private async setupAudio() {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
  }

  async startListening(onTranscription: (text: string) => void): Promise<void> {
    try {
      this.onTranscriptionCallback = onTranscription;
      this.isListening = true;

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.recording = recording;

      // TODO: Implement actual speech-to-text conversion using a local model
      // For now, we'll just simulate a transcription after a few seconds
      setTimeout(() => {
        if (this.onTranscriptionCallback) {
          this.onTranscriptionCallback("This is a simulated transcription");
        }
      }, 3000);

    } catch (error) {
      console.error('Error starting voice recording:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        this.recording = null;
      }
      
      this.isListening = false;
      this.onTranscriptionCallback = null;
    } catch (error) {
      console.error('Error stopping voice recording:', error);
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Speech.speak(text, {
        language: 'en',
        rate: 0.9,
        pitch: 1.0,
        onDone: resolve,
        onError: reject,
      });
    });
  }

  async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }
      await Speech.stop();
    } catch (error) {
      console.error('Error cleaning up voice services:', error);
      throw error;
    }
  }
}