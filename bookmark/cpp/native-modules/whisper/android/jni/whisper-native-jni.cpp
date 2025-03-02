#include <jni.h>
#include <string>
#include <vector>
#include "whisper-native.h"
#include <android/log.h>

#define LOG_TAG "WhisperNative"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

using namespace bookmark::whisper;

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_bookmark_WhisperModule_createContext(
    JNIEnv* env,
    jobject thiz,
    jstring model_path
) {
    const char* path = env->GetStringUTFChars(model_path, nullptr);
    WhisperContext* ctx = whisper_create_context(path);
    env->ReleaseStringUTFChars(model_path, path);
    return reinterpret_cast<jlong>(ctx);
}

JNIEXPORT void JNICALL
Java_com_bookmark_WhisperModule_destroyContext(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr
) {
    auto* ctx = reinterpret_cast<WhisperContext*>(context_ptr);
    whisper_destroy_context(ctx);
}

JNIEXPORT jstring JNICALL
Java_com_bookmark_WhisperModule_transcribe(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr,
    jfloatArray audio_data,
    jint sample_rate
) {
    auto* ctx = reinterpret_cast<WhisperContext*>(context_ptr);
    
    // Convert Java float array to C++ vector
    jsize length = env->GetArrayLength(audio_data);
    jfloat* data = env->GetFloatArrayElements(audio_data, nullptr);
    
    bool success = whisper_transcribe(ctx, data, length, sample_rate);
    env->ReleaseFloatArrayElements(audio_data, data, JNI_ABORT);
    
    if (!success) {
        LOGE("Failed to transcribe audio");
        return env->NewStringUTF("");
    }
    
    const char* transcription = whisper_get_transcription(ctx);
    return env->NewStringUTF(transcription ? transcription : "");
}

} // extern "C"