cmake_minimum_required(VERSION 3.13)
set(CMAKE_CXX_STANDARD 17)

project(whisper-native)

# Include Whisper.cpp
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../whisper.cpp ${CMAKE_CURRENT_BINARY_DIR}/whisper)

# Create the native module library
add_library(whisper-native SHARED
    src/whisper-native.cpp
    src/whisper-native.h
)

# Link against Whisper library
target_link_libraries(whisper-native PRIVATE whisper)

# Include directories
target_include_directories(whisper-native PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../whisper.cpp
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Platform-specific settings
if(ANDROID)
    target_link_libraries(whisper-native PRIVATE log)
endif()

if(IOS)
    set_target_properties(whisper-native PROPERTIES
        FRAMEWORK TRUE
        FRAMEWORK_VERSION A
        MACOSX_FRAMEWORK_IDENTIFIER com.bookmark.whisper
        VERSION 1.0.0
        SOVERSION 1.0.0
    )
endif()