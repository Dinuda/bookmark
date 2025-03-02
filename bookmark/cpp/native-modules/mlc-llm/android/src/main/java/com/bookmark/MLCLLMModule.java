package com.bookmark;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

public class MLCLLMModule extends ReactContextBaseJavaModule {
    private long contextPtr = 0;

    static {
        System.loadLibrary("mlc-llm-native");
    }

    public MLCLLMModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "MLCLLMNative";
    }

    @ReactMethod
    public void createContext(String modelPath, String tokenizerPath, Promise promise) {
        try {
            contextPtr = createContextNative(modelPath, tokenizerPath);
            promise.resolve(contextPtr != 0);
        } catch (Exception e) {
            promise.reject("ERR_MLC_LLM", "Failed to create MLC LLM context: " + e.getMessage());
        }
    }

    @ReactMethod
    public void loadModel(Promise promise) {
        try {
            if (contextPtr == 0) {
                throw new IllegalStateException("MLC LLM context not initialized");
            }

            boolean success = loadModelNative(contextPtr);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("ERR_MLC_LLM", "Failed to load model: " + e.getMessage());
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
            promise.reject("ERR_MLC_LLM", "Failed to cleanup MLC LLM context: " + e.getMessage());
        }
    }

    @ReactMethod
    public void generate(
        String prompt,
        String systemPrompt,
        int maxTokens,
        float temperature,
        float topP,
        Promise promise
    ) {
        try {
            if (contextPtr == 0) {
                throw new IllegalStateException("MLC LLM context not initialized");
            }

            String result = generateNative(
                contextPtr,
                prompt,
                systemPrompt,
                maxTokens,
                temperature,
                topP
            );
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERR_MLC_LLM", "Failed to generate text: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getEmbeddings(String text, Promise promise) {
        try {
            if (contextPtr == 0) {
                throw new IllegalStateException("MLC LLM context not initialized");
            }

            float[] embeddings = getEmbeddingsNative(contextPtr, text);
            if (embeddings == null) {
                throw new IllegalStateException("Failed to get embeddings");
            }

            WritableArray result = Arguments.createArray();
            for (float value : embeddings) {
                result.pushDouble(value);
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERR_MLC_LLM", "Failed to get embeddings: " + e.getMessage());
        }
    }

    // Native method declarations
    private native long createContextNative(String modelPath, String tokenizerPath);
    private native void destroyContextNative(long contextPtr);
    private native boolean loadModelNative(long contextPtr);
    private native String generateNative(
        long contextPtr,
        String prompt,
        String systemPrompt,
        int maxTokens,
        float temperature,
        float topP
    );
    private native float[] getEmbeddingsNative(long contextPtr, String text);
}