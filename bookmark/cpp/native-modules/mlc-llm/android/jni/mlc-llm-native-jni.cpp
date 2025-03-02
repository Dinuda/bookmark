#include <jni.h>
#include <string>
#include <vector>
#include "mlc-llm-native.h"
#include <android/log.h>

#define LOG_TAG "MLCLLMNative"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

using namespace bookmark::mlc_llm;

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_bookmark_MLCLLMModule_createContext(
    JNIEnv* env,
    jobject thiz,
    jstring model_path,
    jstring tokenizer_path
) {
    const char* m_path = env->GetStringUTFChars(model_path, nullptr);
    const char* t_path = env->GetStringUTFChars(tokenizer_path, nullptr);
    
    LLMContext* ctx = llm_create_context(m_path, t_path);
    
    env->ReleaseStringUTFChars(model_path, m_path);
    env->ReleaseStringUTFChars(tokenizer_path, t_path);
    
    return reinterpret_cast<jlong>(ctx);
}

JNIEXPORT void JNICALL
Java_com_bookmark_MLCLLMModule_destroyContext(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr
) {
    auto* ctx = reinterpret_cast<LLMContext*>(context_ptr);
    llm_destroy_context(ctx);
}

JNIEXPORT jboolean JNICALL
Java_com_bookmark_MLCLLMModule_loadModel(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr
) {
    auto* ctx = reinterpret_cast<LLMContext*>(context_ptr);
    return llm_load_model(ctx);
}

JNIEXPORT jstring JNICALL
Java_com_bookmark_MLCLLMModule_generate(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr,
    jstring prompt,
    jstring system_prompt,
    jint max_tokens,
    jfloat temperature,
    jfloat top_p
) {
    auto* ctx = reinterpret_cast<LLMContext*>(context_ptr);
    
    const char* p = env->GetStringUTFChars(prompt, nullptr);
    const char* sp = env->GetStringUTFChars(system_prompt, nullptr);
    
    const char* result = llm_generate(
        ctx,
        p,
        sp,
        max_tokens,
        temperature,
        top_p
    );
    
    env->ReleaseStringUTFChars(prompt, p);
    env->ReleaseStringUTFChars(system_prompt, sp);
    
    jstring output = env->NewStringUTF(result ? result : "");
    delete[] result; // Free allocated string from C++ side
    return output;
}

JNIEXPORT jfloatArray JNICALL
Java_com_bookmark_MLCLLMModule_getEmbeddings(
    JNIEnv* env,
    jobject thiz,
    jlong context_ptr,
    jstring text
) {
    auto* ctx = reinterpret_cast<LLMContext*>(context_ptr);
    const char* input = env->GetStringUTFChars(text, nullptr);
    
    // Allocate buffer for embeddings (assuming 768-dimensional embeddings)
    const size_t embedding_size = 768;
    std::vector<float> embeddings(embedding_size);
    
    size_t actual_size = llm_get_embeddings(
        ctx,
        input,
        embeddings.data(),
        embedding_size
    );
    
    env->ReleaseStringUTFChars(text, input);
    
    if (actual_size == 0) {
        return nullptr;
    }
    
    jfloatArray result = env->NewFloatArray(actual_size);
    env->SetFloatArrayRegion(result, 0, actual_size, embeddings.data());
    return result;
}

} // extern "C"