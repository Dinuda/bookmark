# Cursor Prompt: Building bookmark - A Local LLM Book Conversation App

## App Concept: bookmark

bookmark is a mobile application that provides users with an AI-powered conversational companion for books. Users can select a book, engage in voice conversations about the content, take notes during discussions, inquire about vocabulary, and receive session summaries. The key differentiator is that the app runs a small LLM locally on the device for privacy and offline use.

## Technical Requirements

### Core Features
1. Book selection and loading into local context
2. Voice-based conversation with AI about book content
3. Real-time note-taking during conversations
4. Vocabulary explanations on request
5. End-of-session summaries highlighting key points discussed

### Technical Stack
- **Frontend**: React Native for cross-platform mobile development
- **AI Model**: Local Llama 3 8B or similar optimized for mobile
- **Speech Recognition**: Local Whisper.cpp implementation
- **Text-to-Speech**: Local Piper or Coqui TTS
- **Local Database**: SQLite for user data, notes, and book metadata
- **Vector Storage**: FAISS or ChromaDB (mobile version) for book content retrieval

## Development Instructions

### 1. Project Setup
```bash
# Initialize React Native project
npx react-native init bookmark
cd bookmark

# Install necessary dependencies
npm install react-native-mlkit react-native-sqlite-storage react-native-voice react-native-tts @react-navigation/native @react-native-async-storage/async-storage
```

### 2. Model Integration
- Implement MLC LLM framework to run Llama 3 8B or similar model locally
- Quantize the model to reduce size (4-bit quantization recommended)
- Create a service for model inference with appropriate context window management

### 3. Book Processing Pipeline
- Develop a processing script to:
  - Split books into semantic chunks
  - Generate embeddings for each chunk
  - Store embeddings in a compressed format suitable for mobile
  - Create metadata index for quick reference

### 4. Voice Interface
- Implement Whisper.cpp for local speech recognition
- Integrate Piper/Coqui TTS for natural-sounding responses
- Create a voice session manager to handle conversation flow

### 5. Retrieval System
- Implement a RAG (Retrieval Augmented Generation) system using:
  - Local FAISS index for storing book embeddings
  - Context window management to maintain conversation relevance
  - Query reformulation to improve retrieval accuracy

### 6. Note-Taking System
- Create a note-taking service that:
  - Extracts important points during conversation
  - Allows user to flag content for saving
  - Organizes notes by book and session

### 7. Session Management
- Develop session handlers to:
  - Initialize book context
  - Maintain conversation history within model context limits
  - Generate end-of-session summaries
  - Save user progress

### 8. UI/UX Design
- Create intuitive screens for:
  - Book selection/import
  - Voice conversation with visual feedback
  - Note display and organization
  - Session history and summaries

## Optimization Considerations
- Implement efficient threading to prevent UI freezing during model inference
- Use model distillation or pruning techniques to reduce size while maintaining quality
- Implement battery usage optimization strategies
- Create adaptive inference based on device capabilities
- Consider hybrid approach for complex queries that exceed local model capabilities

## Testing Strategy
- Unit tests for core model functions
- Integration tests for the retrieval system accuracy
- Performance testing on various device specifications
- User testing focused on conversation quality and voice recognition accuracy

## Extensions for Future Versions
- Multiple book support with shared notes and cross-references
- Book club features for sharing insights with friends
- Reading progress tracking
- Spaced repetition for key concepts retention