require 'json'

package = JSON.parse(File.read(File.join(__dir__, '../../../package.json')))

Pod::Spec.new do |s|
  s.name         = "FaissNative"
  s.version      = package['version']
  s.summary      = "FAISS vector similarity search for React Native"
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
    "OTHER_CPLUSPLUSFLAGS" => "-fcxx-modules",
    "HEADER_SEARCH_PATHS" => "$(PODS_TARGET_SRCROOT)/../../../faiss"
  }

  s.dependency "React-Core"
  s.dependency "FaissFramework" # Our custom framework built from FAISS
end