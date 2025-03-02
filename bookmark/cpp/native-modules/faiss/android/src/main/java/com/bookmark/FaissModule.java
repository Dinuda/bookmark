package com.bookmark;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class FaissModule extends ReactContextBaseJavaModule {
    private long indexPtr = 0;

    static {
        System.loadLibrary("faiss-native");
    }

    public FaissModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "FaissNative";
    }

    public static class SearchResult {
        public final int index;
        public final float distance;

        public SearchResult(int index, float distance) {
            this.index = index;
            this.distance = distance;
        }
    }

    @ReactMethod
    public void createIndex(int dimension, Promise promise) {
        try {
            indexPtr = createIndexNative(dimension);
            promise.resolve(indexPtr != 0);
        } catch (Exception e) {
            promise.reject("ERR_FAISS", "Failed to create FAISS index: " + e.getMessage());
        }
    }

    @ReactMethod
    public void loadIndex(String path, Promise promise) {
        try {
            indexPtr = loadIndexNative(path);
            promise.resolve(indexPtr != 0);
        } catch (Exception e) {
            promise.reject("ERR_FAISS", "Failed to load FAISS index: " + e.getMessage());
        }
    }

    @ReactMethod
    public void cleanup(Promise promise) {
        try {
            if (indexPtr != 0) {
                destroyIndexNative(indexPtr);
                indexPtr = 0;
            }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERR_FAISS", "Failed to cleanup FAISS index: " + e.getMessage());
        }
    }

    @ReactMethod
    public void addEmbedding(ReadableArray embedding, Promise promise) {
        try {
            if (indexPtr == 0) {
                throw new IllegalStateException("FAISS index not initialized");
            }

            float[] data = new float[embedding.size()];
            for (int i = 0; i < embedding.size(); i++) {
                data[i] = (float) embedding.getDouble(i);
            }

            boolean success = addEmbeddingNative(indexPtr, data);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("ERR_FAISS", "Failed to add embedding: " + e.getMessage());
        }
    }

    @ReactMethod
    public void search(ReadableArray query, int k, Promise promise) {
        try {
            if (indexPtr == 0) {
                throw new IllegalStateException("FAISS index not initialized");
            }

            float[] queryData = new float[query.size()];
            for (int i = 0; i < query.size(); i++) {
                queryData[i] = (float) query.getDouble(i);
            }

            SearchResult[] results = searchNative(indexPtr, queryData, k);
            WritableArray resultArray = Arguments.createArray();

            for (SearchResult result : results) {
                WritableMap resultMap = Arguments.createMap();
                resultMap.putInt("index", result.index);
                resultMap.putDouble("distance", result.distance);
                resultArray.pushMap(resultMap);
            }

            promise.resolve(resultArray);
        } catch (Exception e) {
            promise.reject("ERR_FAISS", "Failed to search embeddings: " + e.getMessage());
        }
    }

    @ReactMethod
    public void saveIndex(String path, Promise promise) {
        try {
            if (indexPtr == 0) {
                throw new IllegalStateException("FAISS index not initialized");
            }

            boolean success = saveIndexNative(indexPtr, path);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("ERR_FAISS", "Failed to save index: " + e.getMessage());
        }
    }

    @ReactMethod
    public void clearIndex(Promise promise) {
        try {
            if (indexPtr == 0) {
                throw new IllegalStateException("FAISS index not initialized");
            }

            clearIndexNative(indexPtr);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERR_FAISS", "Failed to clear index: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getSize(Promise promise) {
        try {
            if (indexPtr == 0) {
                throw new IllegalStateException("FAISS index not initialized");
            }

            long size = getSizeNative(indexPtr);
            promise.resolve(size);
        } catch (Exception e) {
            promise.reject("ERR_FAISS", "Failed to get index size: " + e.getMessage());
        }
    }

    // Native method declarations
    private native long createIndexNative(int dimension);
    private native long loadIndexNative(String path);
    private native void destroyIndexNative(long indexPtr);
    private native boolean addEmbeddingNative(long indexPtr, float[] embedding);
    private native SearchResult[] searchNative(long indexPtr, float[] query, int k);
    private native boolean saveIndexNative(long indexPtr, String path);
    private native void clearIndexNative(long indexPtr);
    private native long getSizeNative(long indexPtr);
}