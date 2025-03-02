#pragma once

#include <string>
#include <vector>
#include <memory>
#include <mlc/llm.h>

namespace bookmark {
namespace mlc_llm {

class LLMContext {
public:
    static LLMContext* create(const std::string& model_path, const std::string& tokenizer_path);
    ~LLMContext();

    bool loadModel();
    std::string generate(const std::string& prompt, 
                        const std::string& system_prompt,
                        int max_tokens = 512,
                        float temperature = 0.7f,
                        float top_p = 0.95f);
    std::vector<float> getEmbeddings(const std::string& text);

private:
    LLMContext(const std::string& model_path, const std::string& tokenizer_path);
    std::unique_ptr<mlc::llm::LLMContext> ctx_;
    std::string model_path_;
    std::string tokenizer_path_;
    bool is_loaded_ = false;
};

// React Native binding interface
extern "C" {
    LLMContext* llm_create_context(const char* model_path, const char* tokenizer_path);
    void llm_destroy_context(LLMContext* ctx);
    bool llm_load_model(LLMContext* ctx);
    const char* llm_generate(LLMContext* ctx, 
                           const char* prompt,
                           const char* system_prompt,
                           int max_tokens,
                           float temperature,
                           float top_p);
    size_t llm_get_embeddings(LLMContext* ctx, 
                             const char* text, 
                             float* embedding_out,
                             size_t embedding_size);
}

} // namespace mlc_llm
} // namespace bookmark