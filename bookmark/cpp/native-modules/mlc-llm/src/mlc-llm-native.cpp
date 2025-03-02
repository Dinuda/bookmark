#include "mlc-llm-native.h"
#include <stdexcept>
#include <thread>

namespace bookmark {
namespace mlc_llm {

LLMContext* LLMContext::create(const std::string& model_path, const std::string& tokenizer_path) {
    return new LLMContext(model_path, tokenizer_path);
}

LLMContext::LLMContext(const std::string& model_path, const std::string& tokenizer_path)
    : model_path_(model_path), tokenizer_path_(tokenizer_path) {}

LLMContext::~LLMContext() {
    ctx_.reset();
}

bool LLMContext::loadModel() {
    if (is_loaded_) return true;

    try {
        // Configure model settings for 4-bit quantization
        mlc::llm::ModelConfig config;
        config.model_path = model_path_;
        config.tokenizer_path = tokenizer_path_;
        config.quantization = "q4_0"; // 4-bit quantization
        config.use_metal = true;      // Use Metal on iOS/macOS
        
        // Initialize the model
        ctx_ = std::make_unique<mlc::llm::LLMContext>(config);
        is_loaded_ = true;
        return true;
    } catch (...) {
        return false;
    }
}

std::string LLMContext::generate(const std::string& prompt,
                                const std::string& system_prompt,
                                int max_tokens,
                                float temperature,
                                float top_p) {
    if (!is_loaded_) {
        throw std::runtime_error("Model not loaded");
    }

    try {
        // Configure generation parameters
        mlc::llm::GenerationConfig config;
        config.max_length = max_tokens;
        config.temperature = temperature;
        config.top_p = top_p;
        
        // Create the full prompt with system context
        std::string full_prompt;
        if (!system_prompt.empty()) {
            full_prompt = system_prompt + "\n\n" + prompt;
        } else {
            full_prompt = prompt;
        }
        
        // Generate text
        std::string result;
        auto callback = [&result](const std::string& token) {
            result += token;
            return true;
        };
        
        ctx_->generate(full_prompt, config, callback);
        return result;
    } catch (...) {
        return "Error generating text";
    }
}

std::vector<float> LLMContext::getEmbeddings(const std::string& text) {
    if (!is_loaded_) {
        throw std::runtime_error("Model not loaded");
    }

    try {
        // Get embeddings from the last hidden state
        return ctx_->get_embeddings(text);
    } catch (...) {
        return std::vector<float>();
    }
}

// C API Implementation
extern "C" {

LLMContext* llm_create_context(const char* model_path, const char* tokenizer_path) {
    if (!model_path || !tokenizer_path) return nullptr;
    return LLMContext::create(model_path, tokenizer_path);
}

void llm_destroy_context(LLMContext* ctx) {
    delete ctx;
}

bool llm_load_model(LLMContext* ctx) {
    if (!ctx) return false;
    return ctx->loadModel();
}

const char* llm_generate(LLMContext* ctx,
                        const char* prompt,
                        const char* system_prompt,
                        int max_tokens,
                        float temperature,
                        float top_p) {
    if (!ctx || !prompt) return nullptr;
    
    try {
        // Use empty string if system_prompt is null
        std::string result = ctx->generate(
            prompt,
            system_prompt ? system_prompt : "",
            max_tokens,
            temperature,
            top_p
        );
        
        // Allocate and copy string for C interface
        char* output = new char[result.length() + 1];
        strcpy(output, result.c_str());
        return output;
    } catch (...) {
        return nullptr;
    }
}

size_t llm_get_embeddings(LLMContext* ctx,
                         const char* text,
                         float* embedding_out,
                         size_t embedding_size) {
    if (!ctx || !text || !embedding_out) return 0;
    
    try {
        std::vector<float> embeddings = ctx->getEmbeddings(text);
        
        // Copy embeddings to output buffer
        size_t size = std::min(embedding_size, embeddings.size());
        std::copy(embeddings.begin(), embeddings.begin() + size, embedding_out);
        return size;
    } catch (...) {
        return 0;
    }
}

} // extern "C"

} // namespace mlc_llm
} // namespace bookmark