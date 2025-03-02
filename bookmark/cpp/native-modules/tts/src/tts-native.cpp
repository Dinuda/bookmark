#include "tts-native.h"
#include <stdexcept>
#include <vector>

namespace bookmark {
namespace tts {

TTSContext* TTSContext::create(const std::string& model_path, const std::string& config_path) {
    return new TTSContext(model_path, config_path);
}

TTSContext::TTSContext(const std::string& model_path, const std::string& config_path)
    : model_path_(model_path), config_path_(config_path) {}

TTSContext::~TTSContext() {
    ctx_.reset();
}

bool TTSContext::loadModel() {
    if (is_loaded_) return true;

    try {
        // Initialize Piper TTS model with configuration
        piper::PiperConfig config;
        config.model_path = model_path_;
        config.config_path = config_path_;
        
        ctx_ = std::make_unique<piper::PiperContext>(config);
        is_loaded_ = true;
        return true;
    } catch (...) {
        return false;
    }
}

std::vector<float> TTSContext::synthesize(const std::string& text) {
    if (!is_loaded_) {
        throw std::runtime_error("Model not loaded");
    }

    try {
        // Generate audio samples from text
        std::vector<float> audio_samples;
        ctx_->synthesize(text, audio_samples);
        return audio_samples;
    } catch (...) {
        return std::vector<float>();
    }
}

// C API Implementation
extern "C" {

TTSContext* tts_create_context(const char* model_path, const char* config_path) {
    if (!model_path || !config_path) return nullptr;
    return TTSContext::create(model_path, config_path);
}

void tts_destroy_context(TTSContext* ctx) {
    delete ctx;
}

bool tts_load_model(TTSContext* ctx) {
    if (!ctx) return false;
    return ctx->loadModel();
}

size_t tts_synthesize(TTSContext* ctx,
                     const char* text,
                     float* audio_out,
                     size_t max_samples) {
    if (!ctx || !text || !audio_out) return 0;
    
    try {
        std::vector<float> samples = ctx->synthesize(text);
        
        // Copy samples to output buffer, limited by max_samples
        size_t size = std::min(max_samples, samples.size());
        std::copy(samples.begin(), samples.begin() + size, audio_out);
        return size;
    } catch (...) {
        return 0;
    }
}

} // extern "C"

} // namespace tts
} // namespace bookmark