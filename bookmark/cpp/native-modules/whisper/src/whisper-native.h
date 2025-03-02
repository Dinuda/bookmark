#pragma once

#include <string>
#include <vector>
#include <memory>
#include <whisper.h>

namespace bookmark {
namespace whisper {

class WhisperContext {
public:
    static WhisperContext* create(const std::string& model_path);
    ~WhisperContext();

    bool transcribe(const std::vector<float>& pcm_data, int sample_rate);
    std::string getTranscription() const;

private:
    WhisperContext(struct whisper_context* ctx);
    struct whisper_context* ctx_;
    std::string last_transcription_;
};

// React Native binding interface
extern "C" {
    WhisperContext* whisper_create_context(const char* model_path);
    void whisper_destroy_context(WhisperContext* ctx);
    bool whisper_transcribe(WhisperContext* ctx, const float* pcm_data, size_t pcm_size, int sample_rate);
    const char* whisper_get_transcription(WhisperContext* ctx);
}

} // namespace whisper
} // namespace bookmark