#include "faiss-native.h"

namespace bookmark {
namespace faiss {

FaissIndex* FaissIndex::create(int dimension) {
    auto* index = new ::faiss::IndexFlatL2(dimension);
    if (!index) {
        return nullptr;
    }
    return new FaissIndex(index);
}

FaissIndex* FaissIndex::load(const std::string& path) {
    try {
        auto* index = dynamic_cast<::faiss::IndexFlat*>(::faiss::read_index(path.c_str()));
        if (!index) {
            return nullptr;
        }
        return new FaissIndex(index);
    } catch (...) {
        return nullptr;
    }
}

FaissIndex::FaissIndex(::faiss::IndexFlat* index) : index_(index) {}

FaissIndex::~FaissIndex() {
    delete index_;
}

bool FaissIndex::add(const std::vector<float>& embedding) {
    try {
        index_->add(1, embedding.data());
        return true;
    } catch (...) {
        return false;
    }
}

std::vector<std::pair<int, float>> FaissIndex::search(const std::vector<float>& query, int k) {
    try {
        std::vector<float> distances(k);
        std::vector<::faiss::idx_t> indices(k);
        
        index_->search(1, query.data(), k, distances.data(), indices.data());
        
        std::vector<std::pair<int, float>> results;
        results.reserve(k);
        for (int i = 0; i < k; ++i) {
            results.emplace_back(indices[i], distances[i]);
        }
        return results;
    } catch (...) {
        return {};
    }
}

bool FaissIndex::save(const std::string& path) {
    try {
        ::faiss::write_index(index_, path.c_str());
        return true;
    } catch (...) {
        return false;
    }
}

void FaissIndex::clear() {
    try {
        index_->reset();
    } catch (...) {
        // Ignore errors in reset
    }
}

size_t FaissIndex::size() const {
    return index_->ntotal;
}

// C API Implementation
extern "C" {

FaissIndex* faiss_create_index(int dimension) {
    return FaissIndex::create(dimension);
}

FaissIndex* faiss_load_index(const char* path) {
    if (!path) return nullptr;
    return FaissIndex::load(path);
}

void faiss_destroy_index(FaissIndex* index) {
    delete index;
}

bool faiss_add_embedding(FaissIndex* index, const float* embedding, size_t size) {
    if (!index || !embedding || size == 0) return false;
    return index->add(std::vector<float>(embedding, embedding + size));
}

size_t faiss_search(FaissIndex* index, const float* query, size_t query_size, int k, int* indices, float* distances) {
    if (!index || !query || !indices || !distances || query_size == 0) return 0;
    
    auto results = index->search(std::vector<float>(query, query + query_size), k);
    
    for (size_t i = 0; i < results.size(); ++i) {
        indices[i] = results[i].first;
        distances[i] = results[i].second;
    }
    
    return results.size();
}

bool faiss_save_index(FaissIndex* index, const char* path) {
    if (!index || !path) return false;
    return index->save(path);
}

void faiss_clear_index(FaissIndex* index) {
    if (index) index->clear();
}

size_t faiss_get_size(FaissIndex* index) {
    return index ? index->size() : 0;
}

} // extern "C"

} // namespace faiss
} // namespace bookmark