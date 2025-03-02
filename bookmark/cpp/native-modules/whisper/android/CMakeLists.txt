cmake_minimum_required(VERSION 3.13)

# Set the project name
project(whisper-native)

# Include Whisper library
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../../whisper.cpp ${CMAKE_CURRENT_BINARY_DIR}/whisper)

# Create the native module library
add_library(whisper-native SHARED
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/whisper-native.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/jni/whisper-native-jni.cpp
)

# Include directories
target_include_directories(whisper-native PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../whisper.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${ANDROID_NDK}/sources/cxx-stl/llvm-libc++/include
)

# Link against Whisper library and Android log library
target_link_libraries(whisper-native
    whisper
    log
)