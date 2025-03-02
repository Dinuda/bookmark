#include <jni.h>
#include <string>
#include <vector>
#include "tts-native.h"
#include <android/log.h>

#define LOG_TAG "TTSNative"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

using namespace bookmark::tts;

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_bookmark_TTSModule_createContext(
    JNIEnv* env,
    jobject thiz,
    jstring model_path,
    jstring config_path
) {
    const char* m_path = env->GetStringUTFChars(model_path, nullptr);
    const char* c_path = env->GetStringUTFChars(config_path, nullptr);
    
    TTSContext* ctx = tts_create_context(m_path, c_path);
    
    env->ReleaseStringUTFChars(model_path, m_path);
    env->ReleaseStringUTFChars(config_path, c_path);
    
    return reinterpret_cast<jlong>(ctx);
}

JNIEXPORT void JNICALL
Java_com_bookmark_TTSModule_destroyContext(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr
) {
    auto* ctx = reinterpret_cast<TTSContext*>(context_ptr);
    tts_destroy_context(ctx);
}

JNIEXPORT jboolean JNICALL
Java_com_bookmark_TTSModule_loadModel(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr
) {
    auto* ctx = reinterpret_cast<TTSContext*>(context_ptr);
    return tts_load_model(ctx);
}

JNIEXPORT jfloatArray JNICALL
Java_com_bookmark_TTSModule_synthesize(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr,
    jstring text
) {
    auto* ctx = reinterpret_cast<TTSContext*>(context_ptr);
    const char* input = env->GetStringUTFChars(text, nullptr);
    
    // Allocate a large enough buffer for audio samples
    const size_t max_samples = 1024 * 1024; // 1M samples
    std::vector<float> audio_buffer(max_samples);
    
    size_t num_samples = tts_synthesize(
        ctx,
        input,
        audio_buffer.data(),
        max_samples
    );
    
    env->ReleaseStringUTFChars(text, input);
    
    if (num_samples == 0) {
        return nullptr;
    }
    
    jfloatArray result = env->NewFloatArray(num_samples);
    env->SetFloatArrayRegion(result, 0, num_samples, audio_buffer.data());
    return result;
}

} // extern "C"