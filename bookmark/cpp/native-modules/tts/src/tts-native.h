#pragma once

#include <string>
#include <memory>
#include <vector>
#include "piper/piper.h"

namespace bookmark {
namespace tts {

class TTSContext {
public:
    static TTSContext* create(const std::string& model_path, const std::string& config_path);
    ~TTSContext();

    bool loadModel();
    std::vector<float> synthesize(const std::string& text);

private:
    TTSContext(const std::string& model_path, const std::string& config_path);

    std::string model_path_;
    std::string config_path_;
    std::unique_ptr<piper::PiperContext> ctx_;
    bool is_loaded_ = false;
};

// C API declarations for TTS
extern "C" {

TTSContext* tts_create_context(const char* model_path, const char* config_path);
void tts_destroy_context(TTSContext* ctx);
bool tts_load_model(TTSContext* ctx);
size_t tts_synthesize(TTSContext* ctx, const char* text, float* audio_out, size_t max_samples);

} // extern "C"

} // namespace tts
} // namespace bookmark