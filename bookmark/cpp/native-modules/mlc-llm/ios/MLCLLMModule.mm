#import "MLCLLMModule.h"
#import <React/RCTLog.h>
#import "mlc-llm-native.h"

using namespace bookmark::mlc_llm;

@implementation MLCLLMModule {
    LLMContext* _context;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
    if (self = [super init]) {
        _context = nullptr;
    }
    return self;
}

- (void)dealloc {
    if (_context != nullptr) {
        llm_destroy_context(_context);
        _context = nullptr;
    }
}

RCT_EXPORT_METHOD(createContext:(NSString*)modelPath
                  tokenizerPath:(NSString*)tokenizerPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context != nullptr) {
            llm_destroy_context(_context);
        }

        _context = llm_create_context(
            [modelPath UTF8String],
            [tokenizerPath UTF8String]
        );
        resolve(@(_context != nullptr));
    } @catch (NSException* e) {
        reject(@"ERR_MLC_LLM", @"Failed to create MLC LLM context", nil);
    }
}

RCT_EXPORT_METHOD(loadModel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context == nullptr) {
            reject(@"ERR_MLC_LLM", @"MLC LLM context not initialized", nil);
            return;
        }

        bool success = llm_load_model(_context);
        resolve(@(success));
    } @catch (NSException* e) {
        reject(@"ERR_MLC_LLM", @"Failed to load model", nil);
    }
}

RCT_EXPORT_METHOD(cleanup:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context != nullptr) {
            llm_destroy_context(_context);
            _context = nullptr;
        }
        resolve(nil);
    } @catch (NSException* e) {
        reject(@"ERR_MLC_LLM", @"Failed to cleanup MLC LLM context", nil);
    }
}

RCT_EXPORT_METHOD(generate:(NSString*)prompt
                  systemPrompt:(NSString*)systemPrompt
                  maxTokens:(nonnull NSNumber*)maxTokens
                  temperature:(nonnull NSNumber*)temperature
                  topP:(nonnull NSNumber*)topP
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context == nullptr) {
            reject(@"ERR_MLC_LLM", @"MLC LLM context not initialized", nil);
            return;
        }

        const char* result = llm_generate(
            _context,
            [prompt UTF8String],
            [systemPrompt UTF8String],
            [maxTokens intValue],
            [temperature floatValue],
            [topP floatValue]
        );

        if (result == nullptr) {
            reject(@"ERR_MLC_LLM", @"Failed to generate text", nil);
            return;
        }

        NSString* output = @(result);
        delete[] result; // Free allocated string from C++ side
        resolve(output);
    } @catch (NSException* e) {
        reject(@"ERR_MLC_LLM", @"Failed to generate text", nil);
    }
}

RCT_EXPORT_METHOD(getEmbeddings:(NSString*)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context == nullptr) {
            reject(@"ERR_MLC_LLM", @"MLC LLM context not initialized", nil);
            return;
        }

        // Allocate buffer for embeddings (assuming 768-dimensional embeddings)
        const size_t embedding_size = 768;
        std::vector<float> embeddings(embedding_size);

        size_t actual_size = llm_get_embeddings(
            _context,
            [text UTF8String],
            embeddings.data(),
            embedding_size
        );

        if (actual_size == 0) {
            reject(@"ERR_MLC_LLM", @"Failed to get embeddings", nil);
            return;
        }

        NSMutableArray* result = [NSMutableArray arrayWithCapacity:actual_size];
        for (size_t i = 0; i < actual_size; i++) {
            [result addObject:@(embeddings[i])];
        }

        resolve(result);
    } @catch (NSException* e) {
        reject(@"ERR_MLC_LLM", @"Failed to get embeddings", nil);
    }
}

@end