#import "TTSModule.h"
#import <React/RCTLog.h>
#import "tts-native.h"
#import <AVFoundation/AVFoundation.h>

using namespace bookmark::tts;

@implementation TTSModule {
    TTSContext* _context;
    AVAudioEngine* _audioEngine;
    AVAudioPlayerNode* _playerNode;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
    if (self = [super init]) {
        _context = nullptr;
        _audioEngine = [[AVAudioEngine alloc] init];
        _playerNode = [[AVAudioPlayerNode alloc] init];
        [_audioEngine attachNode:_playerNode];
        [_audioEngine connect:_playerNode to:_audioEngine.mainMixerNode format:[_audioEngine.mainMixerNode outputFormatForBus:0]];
        [_audioEngine startAndReturnError:nil];
    }
    return self;
}

- (void)dealloc {
    if (_context != nullptr) {
        tts_destroy_context(_context);
        _context = nullptr;
    }
    [_audioEngine stop];
}

RCT_EXPORT_METHOD(createContext:(NSString*)modelPath
                  configPath:(NSString*)configPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context != nullptr) {
            tts_destroy_context(_context);
        }

        _context = tts_create_context(
            [modelPath UTF8String],
            [configPath UTF8String]
        );
        resolve(@(_context != nullptr));
    } @catch (NSException* e) {
        reject(@"ERR_TTS", @"Failed to create TTS context", nil);
    }
}

RCT_EXPORT_METHOD(loadModel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context == nullptr) {
            reject(@"ERR_TTS", @"TTS context not initialized", nil);
            return;
        }

        bool success = tts_load_model(_context);
        resolve(@(success));
    } @catch (NSException* e) {
        reject(@"ERR_TTS", @"Failed to load model", nil);
    }
}

RCT_EXPORT_METHOD(cleanup:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context != nullptr) {
            tts_destroy_context(_context);
            _context = nullptr;
        }
        resolve(nil);
    } @catch (NSException* e) {
        reject(@"ERR_TTS", @"Failed to cleanup TTS context", nil);
    }
}

RCT_EXPORT_METHOD(synthesize:(NSString*)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        if (_context == nullptr) {
            reject(@"ERR_TTS", @"TTS context not initialized", nil);
            return;
        }

        // Allocate buffer for audio samples (1M samples = ~23 seconds at 44.1kHz)
        const size_t max_samples = 1024 * 1024;
        float* audio_buffer = (float*)malloc(max_samples * sizeof(float));

        size_t num_samples = tts_synthesize(
            _context,
            [text UTF8String],
            audio_buffer,
            max_samples
        );

        if (num_samples == 0) {
            free(audio_buffer);
            reject(@"ERR_TTS", @"Failed to synthesize text", nil);
            return;
        }

        // Create audio buffer list
        AVAudioFormat* format = [[AVAudioFormat alloc] 
            initWithCommonFormat:AVAudioPCMFormatFloat32
            sampleRate:44100
            channels:1
            interleaved:NO
        ];

        AVAudioPCMBuffer* pcmBuffer = [[AVAudioPCMBuffer alloc]
            initWithPCMFormat:format
            frameCapacity:num_samples
        ];
        pcmBuffer.frameLength = num_samples;

        // Copy audio data
        memcpy(pcmBuffer.floatChannelData[0], audio_buffer, num_samples * sizeof(float));
        free(audio_buffer);

        // Play audio
        [_playerNode stop];
        [_playerNode scheduleBuffer:pcmBuffer atTime:nil options:AVAudioPlayerNodeBufferInterrupts completionHandler:nil];
        [_playerNode play];

        // Convert to array for JS
        NSMutableArray* result = [NSMutableArray arrayWithCapacity:num_samples];
        float* samples = pcmBuffer.floatChannelData[0];
        for (size_t i = 0; i < num_samples; i++) {
            [result addObject:@(samples[i])];
        }

        resolve(result);
    } @catch (NSException* e) {
        reject(@"ERR_TTS", @"Failed to synthesize text", nil);
    }
}

- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

@end