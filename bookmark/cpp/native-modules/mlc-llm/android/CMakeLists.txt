cmake_minimum_required(VERSION 3.13)

# Set the project name
project(mlc-llm-native)

# Set MLC LLM build options
set(MLC_LLM_INSTALL_STATIC_LIB ON)
set(BUILD_SHARED_LIBS OFF)
set(USE_CUDA OFF)
set(USE_VULKAN ON)  # Use Vulkan for GPU acceleration on Android

# Include MLC LLM library
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../../mlc-llm ${CMAKE_CURRENT_BINARY_DIR}/mlc-llm)

# Create the native module library
add_library(mlc-llm-native SHARED
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/mlc-llm-native.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/jni/mlc-llm-native-jni.cpp
)

# Include directories
target_include_directories(mlc-llm-native PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../mlc-llm/include
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${ANDROID_NDK}/sources/cxx-stl/llvm-libc++/include
)

# Link against MLC LLM libraries and Android dependencies
target_link_libraries(mlc-llm-native
    mlc_llm_static
    tokenizers_cpp
    tvm_runtime
    log
    vulkan
)