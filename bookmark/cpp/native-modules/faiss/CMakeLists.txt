cmake_minimum_required(VERSION 3.13)
set(CMAKE_CXX_STANDARD 17)

project(faiss-native)

# Include FAISS
set(FAISS_ENABLE_GPU OFF)
set(FAISS_ENABLE_PYTHON OFF)
set(BUILD_TESTING OFF)
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../faiss ${CMAKE_CURRENT_BINARY_DIR}/faiss)

# Create the native module library
add_library(faiss-native SHARED
    src/faiss-native.cpp
    src/faiss-native.h
)

# Link against FAISS library
target_link_libraries(faiss-native PRIVATE faiss)

# Include directories
target_include_directories(faiss-native PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../faiss
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Platform-specific settings
if(ANDROID)
    target_link_libraries(faiss-native PRIVATE log)
endif()

if(IOS)
    set_target_properties(faiss-native PROPERTIES
        FRAMEWORK TRUE
        FRAMEWORK_VERSION A
        MACOSX_FRAMEWORK_IDENTIFIER com.bookmark.faiss
        VERSION 1.0.0
        SOVERSION 1.0.0
    )
endif()