package com.bookmark;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

public class WhisperModule extends ReactContextBaseJavaModule {
    private long contextPtr = 0;

    static {
        System.loadLibrary("whisper-native");
    }

    public WhisperModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "WhisperNative";
    }

    @ReactMethod
    public void createContext(String modelPath, Promise promise) {
        try {
            contextPtr = createContextNative(modelPath);
            promise.resolve(contextPtr != 0);
        } catch (Exception e) {
            promise.reject("ERR_WHISPER", "Failed to create Whisper context: " + e.getMessage());
        }
    }

    @ReactMethod
    public void cleanup(Promise promise) {
        try {
            if (contextPtr != 0) {
                destroyContextNative(contextPtr);
                contextPtr = 0;
            }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERR_WHISPER", "Failed to cleanup Whisper context: " + e.getMessage());
        }
    }

    @ReactMethod
    public void transcribe(ReadableArray audioData, double sampleRate, ReadableMap options, Promise promise) {
        try {
            if (contextPtr == 0) {
                throw new IllegalStateException("Whisper context not initialized");
            }

            float[] pcmData = new float[audioData.size()];
            for (int i = 0; i < audioData.size(); i++) {
                pcmData[i] = (float) audioData.getDouble(i);
            }

            String transcription = transcribeNative(contextPtr, pcmData, (int) sampleRate);
            promise.resolve(transcription);
        } catch (Exception e) {
            promise.reject("ERR_WHISPER", "Failed to transcribe audio: " + e.getMessage());
        }
    }

    // Native method declarations
    private native long createContextNative(String modelPath);
    private native void destroyContextNative(long contextPtr);
    private native String transcribeNative(long contextPtr, float[] audioData, int sampleRate);
}