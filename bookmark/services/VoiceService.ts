import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { WhisperModule } from '../native/whisper';
import { TTSModule } from '../native/tts';
import { ModelDownloader } from './ModelDownloader';

type TranscriptionCallback = (text: string) => void;

export class VoiceService {
  private static instance: VoiceService;
  private whisperModule: WhisperModule;
  private ttsModule: TTSModule;
  private modelDownloader: ModelDownloader;
  private recording: Audio.Recording | null = null;
  private isListening: boolean = false;
  private isInitialized: boolean = false;
  private audioPlayer: Audio.Sound | null = null;

  private constructor() {
    this.whisperModule = WhisperModule.getInstance();
    this.ttsModule = TTSModule.getInstance();
    this.modelDownloader = ModelDownloader.getInstance();
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  async initialize(onProgress?: (progress: number) => void): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Download required models
      const whisperModelPath = await this.modelDownloader.ensureModelDownloaded(
        'whisper-tiny',
        (progress) => {
          if (onProgress) {
            onProgress(progress.percent * 0.5); // First 50% for Whisper
          }
        }
      );

      const [ttsModelPath, ttsConfigPath] = await Promise.all([
        this.modelDownloader.ensureModelDownloaded(
          'en-us-amy',
          (progress) => {
            if (onProgress) {
              onProgress(0.5 + progress.percent * 0.5); // Last 50% for TTS
            }
          }
        ),
        FileSystem.downloadAsync(
          'https://huggingface.co/rhasspy/piper-voices/raw/main/en/en_US/amy/medium/config.json',
          `${FileSystem.documentDirectory}models/en-us-amy/config.json`
        ).then(result => result.uri)
      ]);

      // Initialize Whisper
      const whisperInitialized = await this.whisperModule.initialize(whisperModelPath);
      if (!whisperInitialized) {
        throw new Error('Failed to initialize Whisper');
      }

      // Initialize TTS
      const ttsInitialized = await this.ttsModule.initialize(ttsModelPath, ttsConfigPath);
      if (!ttsInitialized) {
        throw new Error('Failed to initialize TTS');
      }

      // Request audio permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Audio recording permission not granted');
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing VoiceService:', error);
      return false;
    }
  }

  async startListening(onTranscription: TranscriptionCallback): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VoiceService not initialized');
    }

    if (this.isListening) {
      return;
    }

    try {
      this.isListening = true;

      // Start recording
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WAV,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 16000 * 16,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 16000 * 16,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await this.recording.startAsync();

      // Start monitoring for voice activity
      this.monitorAudio(onTranscription);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      this.isListening = false;
      throw error;
    }
  }

  private async monitorAudio(onTranscription: TranscriptionCallback): Promise<void> {
    if (!this.recording || !this.isListening) return;

    try {
      const status = await this.recording.getStatusAsync();
      
      // Check if we have enough audio data (e.g., 2 seconds)
      if (status.durationMillis >= 2000) {
        // Stop current recording
        await this.recording.stopAndUnloadAsync();
        
        // Get the recorded file
        const uri = this.recording.getURI();
        if (!uri) throw new Error('No recording URI available');

        // Convert audio to PCM data
        const pcmData = await this.convertAudioToPCM(uri);
        
        // Transcribe the audio
        const transcription = await this.whisperModule.transcribe(
          pcmData,
          16000,
          { language: 'en' }
        );

        if (transcription.trim()) {
          onTranscription(transcription.trim());
        }

        // Start a new recording if still listening
        if (this.isListening) {
          this.recording = new Audio.Recording();
          await this.recording.prepareToRecordAsync({
            android: {
              extension: '.wav',
              outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WAV,
              audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 16000 * 16,
            },
            ios: {
              extension: '.wav',
              audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 16000 * 16,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
          });
          await this.recording.startAsync();
        }
      }

      // Continue monitoring if still listening
      if (this.isListening) {
        setTimeout(() => this.monitorAudio(onTranscription), 500);
      }
    } catch (error) {
      console.error('Error monitoring audio:', error);
      this.isListening = false;
    }
  }

  async stopListening(): Promise<void> {
    this.isListening = false;

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
      this.recording = null;
    }
  }

  async speak(text: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VoiceService not initialized');
    }

    try {
      // Stop any existing playback
      if (this.audioPlayer) {
        await this.audioPlayer.stopAsync();
        await this.audioPlayer.unloadAsync();
        this.audioPlayer = null;
      }

      // Generate speech using TTS
      const audioSamples = await this.ttsModule.synthesize(text);

      // Create an audio buffer from the samples
      const audioBuffer = new ArrayBuffer(audioSamples.length * 4); // 4 bytes per float32
      const view = new Float32Array(audioBuffer);
      audioSamples.forEach((sample, i) => view[i] = sample);

      // Create a temporary file for the audio
      const tempFile = `${FileSystem.cacheDirectory}/temp_speech.wav`;
      await FileSystem.writeAsStringAsync(tempFile, audioBuffer.toString());

      // Play the audio
      this.audioPlayer = new Audio.Sound();
      await this.audioPlayer.loadAsync({ uri: tempFile });
      await this.audioPlayer.playAsync();

      // Clean up when done
      this.audioPlayer.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          await this.audioPlayer?.unloadAsync();
          this.audioPlayer = null;
          await FileSystem.deleteAsync(tempFile, { idempotent: true });
        }
      });
    } catch (error) {
      console.error('Error speaking text:', error);
      throw error;
    }
  }

  private async convertAudioToPCM(uri: string): Promise<Float32Array> {
    try {
      // Read WAV file
      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert Base64 to ArrayBuffer
      const arrayBuffer = new Uint8Array(
        atob(fileData)
          .split('')
          .map(c => c.charCodeAt(0))
      ).buffer;

      // Parse WAV header and get PCM data
      const wavView = new DataView(arrayBuffer);
      const pcmOffset = 44; // Standard WAV header size
      const numSamples = (arrayBuffer.byteLength - pcmOffset) / 2; // 16-bit samples
      const pcmData = new Float32Array(numSamples);

      // Convert 16-bit PCM to float32 (-1.0 to 1.0)
      for (let i = 0; i < numSamples; i++) {
        const int16Sample = wavView.getInt16(pcmOffset + i * 2, true);
        pcmData[i] = int16Sample / 32768.0;
      }

      return pcmData;
    } catch (error) {
      console.error('Error converting audio to PCM:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopListening();
      if (this.audioPlayer) {
        await this.audioPlayer.stopAsync();
        await this.audioPlayer.unloadAsync();
        this.audioPlayer = null;
      }
      if (this.isInitialized) {
        await Promise.all([
          this.whisperModule.cleanup(),
          this.ttsModule.cleanup()
        ]);
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('Error cleaning up VoiceService:', error);
    }
  }
}