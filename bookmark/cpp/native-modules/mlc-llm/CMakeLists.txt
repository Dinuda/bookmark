cmake_minimum_required(VERSION 3.13)
set(CMAKE_CXX_STANDARD 17)

project(mlc-llm-native)

# Include MLC LLM
set(MLC_LLM_INSTALL_STATIC_LIB ON)
set(BUILD_SHARED_LIBS OFF)
set(USE_CUDA OFF)
set(USE_METAL ON)
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../mlc-llm ${CMAKE_CURRENT_BINARY_DIR}/mlc-llm)

# Create the native module library
add_library(mlc-llm-native SHARED
    src/mlc-llm-native.cpp
    src/mlc-llm-native.h
)

# Link against MLC LLM libraries
target_link_libraries(mlc-llm-native PRIVATE
    mlc_llm_static
    tokenizers_cpp
    tvm_runtime
)

# Include directories
target_include_directories(mlc-llm-native PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../mlc-llm/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Platform-specific settings
if(ANDROID)
    target_link_libraries(mlc-llm-native PRIVATE log)
endif()

if(IOS)
    set_target_properties(mlc-llm-native PROPERTIES
        FRAMEWORK TRUE
        FRAMEWORK_VERSION A
        MACOSX_FRAMEWORK_IDENTIFIER com.bookmark.mlcllm
        VERSION 1.0.0
        SOVERSION 1.0.0
    )
    
    # Enable Metal support for iOS
    target_link_libraries(mlc-llm-native PRIVATE "-framework Metal")
endif()