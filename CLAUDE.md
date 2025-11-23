# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CluelyClaude is a Windows desktop application that provides a translucent, always-on-top overlay for AI-powered screen assistance. Users can capture screenshots and ask questions about their screen content using AI.

**Core Concept**: Translucent Overlay → Manual Screenshot → AI Analysis → Answers

**Key Constraints**:
- Windows-only (no macOS/Linux support)
- Manual screenshot capture via button
- No persistent chat history (session-only)
- Users provide their own Gemini API key

## Architecture

### Technology Stack
- **Framework**: Electron (desktop app)
- **UI**: React or vanilla JavaScript
- **Language**: TypeScript (recommended but optional)
- **Build Tool**: Vite or Webpack
- **AI Provider**: Google Gemini API (`@google/generative-ai`)
- **Screen Capture**: `screenshot-desktop` or native Electron APIs

### Project Structure
```
/src
  /main        - Electron main process (system-level access, screen capture)
  /renderer    - UI components (overlay interface, chat, settings)
  /services    - Screen capture service & Gemini API integration
  /utils       - Helper functions
/resources     - UI reference images and assets
```

### Core Components

1. **Main Process (Electron)**
   - Creates translucent, always-on-top overlay window
   - Handles screen capture (excluding the overlay itself)
   - Manages global hotkeys (Ctrl+/, Ctrl+R)
   - Controls IPC communication with renderer

2. **Renderer Process (Overlay UI)**
   - Dark, translucent chat interface (see `/resources/image.png` for reference)
   - Message display area
   - Input field with "Use Screen" button for screenshot capture
   - Settings panel for API key configuration
   - Draggable and resizable window

3. **Screen Capture Service**
   - Manual screenshot capture via "Use Screen" button
   - Excludes the overlay window from capture
   - Multi-monitor support
   - Image compression before API transmission
   - Converts screenshots to base64 for Gemini

4. **Gemini Service**
   - API key management (stored in local config file)
   - Multimodal input handling (text question + screenshot)
   - Streaming response support
   - Rate limiting and error handling

5. **Storage Layer**
   - API key stored in config file (must be in .gitignore)
   - No persistent screenshot or chat storage
   - Everything cleared on app restart or new chat (Ctrl+R)

### Data Flow
```
User clicks "Use Screen" button
  ↓
Screenshot Service captures screen (excluding overlay)
  ↓
Screenshot attached to chat context
  ↓
User enters question in chat
  ↓
Gemini API receives image + text prompt
  ↓
AI response streamed back
  ↓
Display in chat interface
```

## Key Features

### Overlay Window
- **Always-on-top**: Stays visible over all other windows
- **Translucent background**: Dark theme with transparency
- **Draggable**: User can reposition the window
- **Resizable**: User can adjust window dimensions
- **UI Reference**: See `/resources/image.png` for design

### Global Hotkeys
- **Ctrl+/**: Toggle overlay visibility (show/hide)
- **Ctrl+R**: Start new chat (clears conversation + screenshot)

### Screenshot Capture
- Manual trigger via "Use Screen" button in UI
- Captures entire screen or selected monitor (for multi-monitor setups)
- Overlay window is excluded from the screenshot
- Visual indicator when screenshot is attached ("Sent with screenshot")
- Screenshot persists in current chat until Ctrl+R is pressed

### Chat Interface
- Simple message display (user messages + AI responses)
- Input field at bottom: "Ask about your screen or conversation, or ↩ for Assist"
- "Use Screen" button to capture/attach screenshot
- No persistent history (clears on new chat or app restart)
- Streaming responses from Gemini

### Settings
- API key configuration (accessible via home icon or settings button)
- Display selection for multi-monitor setups
- Gemini model selection (optional)

## Implementation Details

### Window Configuration
```javascript
// Electron BrowserWindow options
{
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: false,
  resizable: true,
  movable: true,
  backgroundColor: '#00000000'
}
```

### Screen Capture Requirements
- Must exclude the overlay window from screenshot
- Use Electron's `desktopCapturer` API or `screenshot-desktop`
- Handle multi-monitor scenarios
- Compress images before sending to API (target: <5MB)

### Gemini Integration
- Use Gemini Vision model (`gemini-1.5-flash` or `gemini-1.5-pro`)
- API key provided by user (never hardcoded)
- Implement retry logic for failed requests
- Handle rate limiting gracefully
- Support streaming responses for better UX

### UI/UX Guidelines
- Follow design in `/resources/image.png`
- Dark theme with translucent background
- Blue accent color for active elements ("Use Screen" button, send arrow)
- Messages show visual indicator when screenshot is attached
- Input field placeholder: "Ask about your screen or conversation, or ↩ for Assist"

### Security Considerations
- API keys stored in local config file (excluded from git)
- Screenshots sent directly to Gemini and discarded after response
- No data persistence (privacy by design)
- User controls when capture happens

## Development Phases

### Phase 1: Electron Setup & Window Configuration (Day 1)
- Initialize Electron project with Vite/Webpack
- Create translucent, always-on-top overlay window
- Implement draggable/resizable functionality
- Set up global hotkeys (Ctrl+/, Ctrl+R)

### Phase 2: Screen Capture (Day 2)
- Implement screenshot capture service
- Exclude overlay window from capture
- Handle multi-monitor support
- Test image compression and format conversion

### Phase 3: Gemini Integration (Day 2-3)
- Set up Gemini API client
- Implement multimodal requests (text + image)
- Add streaming response support
- Error handling and rate limiting

### Phase 4: Chat UI (Day 3-4)
- Build chat interface based on `/resources/image.png`
- Message display (user + AI)
- Input field with "Use Screen" button
- Screenshot attachment indicator
- Streaming message updates

### Phase 5: Settings & Polish (Day 4-5)
- API key configuration UI
- Display selection for multi-monitor
- Error messages and user feedback
- Performance optimization
- UX improvements

### Phase 6: Testing & Documentation (Day 5-6)
- Test on Windows 10/11
- Multi-monitor testing
- Edge case handling
- README and setup guide

**Total MVP Timeline**: 1 week

## Important Notes for Development

- Reference `/resources/image.png` for UI design
- Test overlay transparency and always-on-top behavior early
- Ensure screenshot capture excludes the overlay window
- Keep chat history in memory only (no persistence for MVP)
- Focus on Windows 10/11 compatibility only
- API keys must never be committed to version control
- Ctrl+R should clear both chat messages and screenshot
- Start with Gemini API only (can expand to other LLMs later)
