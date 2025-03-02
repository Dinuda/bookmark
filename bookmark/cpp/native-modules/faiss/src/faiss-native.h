#pragma once

#include <string>
#include <vector>
#include <memory>
#include <faiss/IndexFlat.h>
#include <faiss/index_io.h>

namespace bookmark {
namespace faiss {

class FaissIndex {
public:
    static FaissIndex* create(int dimension);
    static FaissIndex* load(const std::string& path);
    ~FaissIndex();

    bool add(const std::vector<float>& embedding);
    std::vector<std::pair<int, float>> search(const std::vector<float>& query, int k);
    bool save(const std::string& path);
    void clear();
    size_t size() const;

private:
    FaissIndex(::faiss::IndexFlat* index);
    ::faiss::IndexFlat* index_;
};

// React Native binding interface
extern "C" {
    FaissIndex* faiss_create_index(int dimension);
    FaissIndex* faiss_load_index(const char* path);
    void faiss_destroy_index(FaissIndex* index);
    bool faiss_add_embedding(FaissIndex* index, const float* embedding, size_t size);
    size_t faiss_search(FaissIndex* index, const float* query, size_t query_size, int k, int* indices, float* distances);
    bool faiss_save_index(FaissIndex* index, const char* path);
    void faiss_clear_index(FaissIndex* index);
    size_t faiss_get_size(FaissIndex* index);
}

} // namespace faiss
} // namespace bookmark