require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../../../package.json')))

Pod::Spec.new do |s|
  s.name         = "WhisperNative"
  s.version      = package['version']
  s.summary      = "Whisper speech recognition for React Native"
  s.homepage     = "https://github.com/yourusername/bookmark"
  s.license      = "MIT"
  s.author       = { "author" => "author@domain.com" }
  s.platform     = :ios, "13.0"
  s.source       = { :git => "https://github.com/yourusername/bookmark.git", :tag => "#{s.version}" }
  s.source_files = "**/*.{h,m,mm,cpp,swift}"
  s.requires_arc = true
  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "CLANG_CXX_LIBRARY" => "libc++",
    "OTHER_CPLUSPLUSFLAGS" => "-fcxx-modules"
  }

  s.dependency "React-Core"
  s.dependency "WhisperFramework" # Our custom framework built from whisper.cpp
end