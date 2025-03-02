#include <jni.h>
#include <string>
#include <vector>
#include "faiss-native.h"
#include <android/log.h>

#define LOG_TAG "FaissNative"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

using namespace bookmark::faiss;

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_bookmark_FaissModule_createIndex(
    JNIEnv* env,
    jobject thiz,
    jint dimension
) {
    FaissIndex* index = faiss_create_index(dimension);
    return reinterpret_cast<jlong>(index);
}

JNIEXPORT jlong JNICALL
Java_com_bookmark_FaissModule_loadIndex(
    JNIEnv* env,
    jobject thiz,
    jstring path
) {
    const char* file_path = env->GetStringUTFChars(path, nullptr);
    FaissIndex* index = faiss_load_index(file_path);
    env->ReleaseStringUTFChars(path, file_path);
    return reinterpret_cast<jlong>(index);
}

JNIEXPORT void JNICALL
Java_com_bookmark_FaissModule_destroyIndex(
    JNIEnv* env,
    jobject thiz,
    jlong index_ptr
) {
    auto* index = reinterpret_cast<FaissIndex*>(index_ptr);
    faiss_destroy_index(index);
}

JNIEXPORT jboolean JNICALL
Java_com_bookmark_FaissModule_addEmbedding(
    JNIEnv* env,
    jobject thiz,
    jlong index_ptr,
    jfloatArray embedding
) {
    auto* index = reinterpret_cast<FaissIndex*>(index_ptr);
    jsize length = env->GetArrayLength(embedding);
    jfloat* data = env->GetFloatArrayElements(embedding, nullptr);
    
    bool success = faiss_add_embedding(index, data, length);
    env->ReleaseFloatArrayElements(embedding, data, JNI_ABORT);
    
    return success;
}

JNIEXPORT jobjectArray JNICALL
Java_com_bookmark_FaissModule_search(
    JNIEnv* env,
    jobject thiz,
    jlong index_ptr,
    jfloatArray query,
    jint k
) {
    auto* index = reinterpret_cast<FaissIndex*>(index_ptr);
    jsize length = env->GetArrayLength(query);
    jfloat* query_data = env->GetFloatArrayElements(query, nullptr);
    
    // Allocate arrays for results
    std::vector<int> indices(k);
    std::vector<float> distances(k);
    
    size_t num_results = faiss_search(
        index,
        query_data,
        length,
        k,
        indices.data(),
        distances.data()
    );
    
    env->ReleaseFloatArrayElements(query, query_data, JNI_ABORT);
    
    // Create result array of SearchResult objects
    jclass result_class = env->FindClass("com/bookmark/FaissModule$SearchResult");
    jmethodID constructor = env->GetMethodID(result_class, "<init>", "(IF)V");
    
    jobjectArray results = env->NewObjectArray(num_results, result_class, nullptr);
    
    for (size_t i = 0; i < num_results; i++) {
        jobject result = env->NewObject(
            result_class,
            constructor,
            indices[i],
            distances[i]
        );
        env->SetObjectArrayElement(results, i, result);
    }
    
    return results;
}

JNIEXPORT jboolean JNICALL
Java_com_bookmark_FaissModule_saveIndex(
    JNIEnv* env,
    jobject thiz,
    jlong index_ptr,
    jstring path
) {
    auto* index = reinterpret_cast<FaissIndex*>(index_ptr);
    const char* file_path = env->GetStringUTFChars(path, nullptr);
    bool success = faiss_save_index(index, file_path);
    env->ReleaseStringUTFChars(path, file_path);
    return success;
}

JNIEXPORT void JNICALL
Java_com_bookmark_FaissModule_clearIndex(
    JNIEnv* env,
    jobject thiz,
    jlong index_ptr
) {
    auto* index = reinterpret_cast<FaissIndex*>(index_ptr);
    faiss_clear_index(index);
}

JNIEXPORT jlong JNICALL
Java_com_bookmark_FaissModule_getSize(
    JNIEnv* env,
    jobject thiz,
    jlong index_ptr
) {
    auto* index = reinterpret_cast<FaissIndex*>(index_ptr);
    return faiss_get_size(index);
}

} // extern "C"