#include "whisper-native.h"
#include <stdexcept>

namespace bookmark {
namespace whisper {

WhisperContext* WhisperContext::create(const std::string& model_path) {
    struct whisper_context* ctx = whisper_init_from_file(model_path.c_str());
    if (!ctx) {
        return nullptr;
    }
    return new WhisperContext(ctx);
}

WhisperContext::WhisperContext(struct whisper_context* ctx) : ctx_(ctx) {}

WhisperContext::~WhisperContext() {
    if (ctx_) {
        whisper_free(ctx_);
        ctx_ = nullptr;
    }
}

bool WhisperContext::transcribe(const std::vector<float>& pcm_data, int sample_rate) {
    if (!ctx_ || pcm_data.empty()) {
        return false;
    }

    // Whisper parameters
    whisper_full_params params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.print_progress = false;
    params.print_special = false;
    params.print_realtime = false;
    params.print_timestamps = false;
    params.translate = false;
    params.language = "en";
    params.n_threads = 4;

    // Run inference
    if (whisper_full(ctx_, params, pcm_data.data(), pcm_data.size()) != 0) {
        return false;
    }

    // Get transcription
    const int n_segments = whisper_full_n_segments(ctx_);
    last_transcription_.clear();

    for (int i = 0; i < n_segments; ++i) {
        const char* text = whisper_full_get_segment_text(ctx_, i);
        if (text) {
            if (!last_transcription_.empty()) {
                last_transcription_ += " ";
            }
            last_transcription_ += text;
        }
    }

    return true;
}

std::string WhisperContext::getTranscription() const {
    return last_transcription_;
}

// C API Implementation
extern "C" {

WhisperContext* whisper_create_context(const char* model_path) {
    if (!model_path) return nullptr;
    return WhisperContext::create(model_path);
}

void whisper_destroy_context(WhisperContext* ctx) {
    delete ctx;
}

bool whisper_transcribe(WhisperContext* ctx, const float* pcm_data, size_t pcm_size, int sample_rate) {
    if (!ctx || !pcm_data || pcm_size == 0) return false;
    std::vector<float> data(pcm_data, pcm_data + pcm_size);
    return ctx->transcribe(data, sample_rate);
}

const char* whisper_get_transcription(WhisperContext* ctx) {
    if (!ctx) return nullptr;
    return ctx->getTranscription().c_str();
}

} // extern "C"

} // namespace whisper
} // namespace bookmark