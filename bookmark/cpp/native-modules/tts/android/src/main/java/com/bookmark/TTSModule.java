package com.bookmark;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

public class TTSModule extends ReactContextBaseJavaModule {
    private long contextPtr = 0;

    static {
        System.loadLibrary("tts-native");
    }

    public TTSModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "TTSNative";
    }

    @ReactMethod
    public void createContext(String modelPath, String configPath, Promise promise) {
        try {
            contextPtr = createContextNative(modelPath, configPath);
            promise.resolve(contextPtr != 0);
        } catch (Exception e) {
            promise.reject("ERR_TTS", "Failed to create TTS context: " + e.getMessage());
        }
    }

    @ReactMethod
    public void loadModel(Promise promise) {
        try {
            if (contextPtr == 0) {
                throw new IllegalStateException("TTS context not initialized");
            }

            boolean success = loadModelNative(contextPtr);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("ERR_TTS", "Failed to load model: " + e.getMessage());
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
            promise.reject("ERR_TTS", "Failed to cleanup TTS context: " + e.getMessage());
        }
    }

    @ReactMethod
    public void synthesize(String text, Promise promise) {
        try {
            if (contextPtr == 0) {
                throw new IllegalStateException("TTS context not initialized");
            }

            float[] audioSamples = synthesizeNative(contextPtr, text);
            if (audioSamples == null) {
                throw new IllegalStateException("Failed to synthesize audio");
            }

            WritableArray result = Arguments.createArray();
            for (float sample : audioSamples) {
                result.pushDouble(sample);
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERR_TTS", "Failed to synthesize text: " + e.getMessage());
        }
    }

    // Native method declarations
    private native long createContextNative(String modelPath, String configPath);
    private native void destroyContextNative(long contextPtr);
    private native boolean loadModelNative(long contextPtr);
    private native float[] synthesizeNative(long contextPtr, String text);
}