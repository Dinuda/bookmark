#import "WhisperModule.h"
#import <React/RCTLog.h>
#import "whisper-native.h"

@implementation WhisperModule {
    whisper::WhisperContext* _context;
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
        whisper_destroy_context(_context);
        _context = nullptr;
    }
}

RCT_EXPORT_METHOD(createContext:(NSString*)modelPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context != nullptr) {
            whisper_destroy_context(_context);
        }

        _context = whisper_create_context([modelPath UTF8String]);
        resolve(@(_context != nullptr));
    } @catch (NSException* e) {
        reject(@"ERR_WHISPER", @"Failed to create Whisper context", nil);
    }
}

RCT_EXPORT_METHOD(cleanup:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context != nullptr) {
            whisper_destroy_context(_context);
            _context = nullptr;
        }
        resolve(nil);
    } @catch (NSException* e) {
        reject(@"ERR_WHISPER", @"Failed to cleanup Whisper context", nil);
    }
}

RCT_EXPORT_METHOD(transcribe:(NSArray*)audioData
                  sampleRate:(nonnull NSNumber*)sampleRate
                  options:(NSDictionary*)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context == nullptr) {
            reject(@"ERR_WHISPER", @"Whisper context not initialized", nil);
            return;
        }

        // Convert JS array to float array
        float* pcmData = (float*)malloc(audioData.count * sizeof(float));
        for (NSUInteger i = 0; i < audioData.count; i++) {
            pcmData[i] = [audioData[i] floatValue];
        }

        bool success = whisper_transcribe(_context, pcmData, audioData.count, [sampleRate intValue]);
        free(pcmData);

        if (!success) {
            reject(@"ERR_WHISPER", @"Failed to transcribe audio", nil);
            return;
        }

        const char* transcription = whisper_get_transcription(_context);
        resolve(transcription ? @(transcription) : @"");
    } @catch (NSException* e) {
        reject(@"ERR_WHISPER", @"Failed to transcribe audio", nil);
    }
}

@end