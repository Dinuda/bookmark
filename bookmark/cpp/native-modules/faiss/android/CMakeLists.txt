cmake_minimum_required(VERSION 3.13)

# Set the project name
project(faiss-native)

# Set FAISS build options
set(FAISS_ENABLE_GPU OFF)
set(FAISS_ENABLE_PYTHON OFF)
set(BUILD_TESTING OFF)

# Include FAISS library
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../../faiss ${CMAKE_CURRENT_BINARY_DIR}/faiss)

# Create the native module library
add_library(faiss-native SHARED
    ${CMAKE_CURRENT_SOURCE_DIR}/../src/faiss-native.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/jni/faiss-native-jni.cpp
)

# Include directories
target_include_directories(faiss-native PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../faiss
    ${CMAKE_CURRENT_SOURCE_DIR}/../src
    ${ANDROID_NDK}/sources/cxx-stl/llvm-libc++/include
)

# Link against FAISS library and Android log library
target_link_libraries(faiss-native
    faiss
    log
)