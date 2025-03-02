#import "FaissModule.h"
#import <React/RCTLog.h>
#import "faiss-native.h"

using namespace bookmark::faiss;

@implementation FaissModule {
    FaissIndex* _index;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
    if (self = [super init]) {
        _index = nullptr;
    }
    return self;
}

- (void)dealloc {
    if (_index != nullptr) {
        faiss_destroy_index(_index);
        _index = nullptr;
    }
}

RCT_EXPORT_METHOD(createIndex:(nonnull NSNumber*)dimension
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_index != nullptr) {
            faiss_destroy_index(_index);
        }

        _index = faiss_create_index([dimension intValue]);
        resolve(@(_index != nullptr));
    } @catch (NSException* e) {
        reject(@"ERR_FAISS", @"Failed to create FAISS index", nil);
    }
}

RCT_EXPORT_METHOD(loadIndex:(NSString*)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_index != nullptr) {
            faiss_destroy_index(_index);
        }

        _index = faiss_load_index([path UTF8String]);
        resolve(@(_index != nullptr));
    } @catch (NSException* e) {
        reject(@"ERR_FAISS", @"Failed to load FAISS index", nil);
    }
}

RCT_EXPORT_METHOD(cleanup:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_index != nullptr) {
            faiss_destroy_index(_index);
            _index = nullptr;
        }
        resolve(nil);
    } @catch (NSException* e) {
        reject(@"ERR_FAISS", @"Failed to cleanup FAISS index", nil);
    }
}

RCT_EXPORT_METHOD(addEmbedding:(NSArray*)embedding
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_index == nullptr) {
            reject(@"ERR_FAISS", @"FAISS index not initialized", nil);
            return;
        }

        float* data = (float*)malloc(embedding.count * sizeof(float));
        for (NSUInteger i = 0; i < embedding.count; i++) {
            data[i] = [embedding[i] floatValue];
        }

        bool success = faiss_add_embedding(_index, data, embedding.count);
        free(data);

        resolve(@(success));
    } @catch (NSException* e) {
        reject(@"ERR_FAISS", @"Failed to add embedding", nil);
    }
}

RCT_EXPORT_METHOD(search:(NSArray*)query
                  k:(nonnull NSNumber*)k
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_index == nullptr) {
            reject(@"ERR_FAISS", @"FAISS index not initialized", nil);
            return;
        }

        float* queryData = (float*)malloc(query.count * sizeof(float));
        for (NSUInteger i = 0; i < query.count; i++) {
            queryData[i] = [query[i] floatValue];
        }

        std::vector<int> indices([k intValue]);
        std::vector<float> distances([k intValue]);

        size_t numResults = faiss_search(
            _index,
            queryData,
            query.count,
            [k intValue],
            indices.data(),
            distances.data()
        );
        free(queryData);

        NSMutableArray* results = [NSMutableArray arrayWithCapacity:numResults];
        for (size_t i = 0; i < numResults; i++) {
            [results addObject:@{
                @"index": @(indices[i]),
                @"distance": @(distances[i])
            }];
        }

        resolve(results);
    } @catch (NSException* e) {
        reject(@"ERR_FAISS", @"Failed to search embeddings", nil);
    }
}

RCT_EXPORT_METHOD(saveIndex:(NSString*)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_index == nullptr) {
            reject(@"ERR_FAISS", @"FAISS index not initialized", nil);
            return;
        }

        bool success = faiss_save_index(_index, [path UTF8String]);
        resolve(@(success));
    } @catch (NSException* e) {
        reject(@"ERR_FAISS", @"Failed to save index", nil);
    }
}

RCT_EXPORT_METHOD(clearIndex:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_index == nullptr) {
            reject(@"ERR_FAISS", @"FAISS index not initialized", nil);
            return;
        }

        faiss_clear_index(_index);
        resolve(nil);
    } @catch (NSException* e) {
        reject(@"ERR_FAISS", @"Failed to clear index", nil);
    }
}

RCT_EXPORT_METHOD(getSize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_index == nullptr) {
            reject(@"ERR_FAISS", @"FAISS index not initialized", nil);
            return;
        }

        size_t size = faiss_get_size(_index);
        resolve(@(size));
    } @catch (NSException* e) {
        reject(@"ERR_FAISS", @"Failed to get index size", nil);
    }
}

@end