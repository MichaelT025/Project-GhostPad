# Phase 2: Post-MVP Features

This document outlines features to be implemented after MVP testing and initial release.

## Currently Being Implemented (Moved from Phase 2)

### ✅ Streaming Responses
- ✅ Backend: `streamResponse()` already implemented in Gemini provider
- ⏳ Frontend: IPC streaming integration in progress
- Real-time text streaming from LLM providers
- Gradual display of AI responses as they arrive
- Better user experience for long responses

### ⏳ Chat UI Polish
- ⏳ Markdown rendering (marked.js) - supports GitHub-flavored markdown
- ⏳ LaTeX math rendering (KaTeX) - inline and block equations
- ⏳ Code syntax highlighting (highlight.js) - 10+ languages
- ⏳ Copy buttons for code blocks and messages
- ⏳ Improved loading animations with typing indicator
- ⏳ Smooth message fade-in animations
- ⏳ Timestamps with relative time formatting
- ⏳ Enhanced error handling with retry functionality

## High Priority

### 1. Multi-Monitor Support
- Allow users to select which display to capture
- Display picker in settings
- Remember last selected display
- Support for different DPI/resolution per monitor

### 2. Settings Panel UI
- API key management interface
- Provider selection dropdown
- Model selection per provider
- System prompt configuration
- Theme customization options

### 3. Provider Expansion
- **OpenAI Integration**: GPT-4 Vision support
- **Anthropic Integration**: Claude 3 (Opus/Sonnet/Haiku)
- **Custom API Endpoints**: Allow users to configure custom LLM endpoints
- **Local Models**: Ollama, LM Studio integration

## Medium Priority

### 5. Enhanced Screenshot Features
- Screenshot preview before sending
- Crop/edit screenshots before sending
- Multiple screenshots in one conversation
- Screenshot history for current session

### 6. Chat Enhancements
- Export chat history (JSON, Markdown, PDF)
- Search within conversation
- Copy individual messages
- Regenerate responses
- Edit and resend messages

### 7. Keyboard Shortcuts
- Customizable hotkeys
- Quick send (Enter vs Shift+Enter)
- Screenshot capture shortcut (beyond Ctrl+R)
- Settings panel shortcut

### 8. Performance Optimizations
- Lazy loading of message history
- Image compression settings
- Response caching
- Token usage tracking and display

## Low Priority

### 9. Advanced Features
- Context window management
- Temperature/top-p controls per provider
- Cost tracking per provider

### 10. UI/UX Improvements
- Drag-and-drop image upload
- Notification system for responses
- Avatar customization

### 11. Accessibility
- Screen reader support
- High contrast mode
- Font size adjustment
- Keyboard-only navigation

### 12. Data Management
- Optional conversation persistence
- Conversation templates
- Favorite prompts/responses
- Import/export settings

## Future Considerations

### Advanced AI Features
- Multi-turn context management
- Agent-like behavior (tools, actions)
- Voice input/output
- OCR for screenshot text extraction

### Integration Features
- Browser extension for web capture
- API for external integrations
- Webhook support
- Cloud sync (optional, privacy-focused)

### Platform Expansion
- macOS support (if demand exists)
- Linux support (if demand exists)
- Mobile companion app (view-only)

---

**Note**: Features will be prioritized based on user feedback, testing results, and development complexity.
