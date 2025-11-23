# CluelyClaude Implementation Plan

This document provides a detailed step-by-step plan for implementing the CluelyClaude desktop application from scratch.

## Project Overview
Building a Windows desktop app with a translucent overlay for AI-powered screen assistance using Electron, React, and Gemini API.

---

## Phase 1: Project Initialization & Setup

### Step 1.1: Initialize Node.js Project
```bash
npm init -y
```

**Configure package.json:**
- Set name to "cluelyclaude"
- Set version to "0.1.0"
- Set description
- Add scripts for dev, build, and start

### Step 1.2: Install Core Dependencies
```bash
# Electron and build tools
npm install electron electron-builder

# React and related
npm install react react-dom

# Build tooling (Vite)
npm install vite @vitejs/plugin-react

# TypeScript (optional but recommended)
npm install -D typescript @types/react @types/react-dom @types/node

# Screen capture
npm install screenshot-desktop

# Gemini API
npm install @google/generative-ai

# Utilities
npm install electron-store  # For persistent config storage
```

### Step 1.3: Project Structure
Create the following directory structure:
```
/src
  /main
    main.js              # Electron main process entry
    ipc-handlers.js      # IPC communication handlers
    window-manager.js    # Window creation and management
  /renderer
    /components
      Chat.jsx           # Main chat interface
      Message.jsx        # Individual message component
      InputBar.jsx       # Input field with "Use Screen" button
      Settings.jsx       # Settings panel
    App.jsx              # Root component
    index.jsx            # Renderer entry point
    index.html           # HTML template
  /services
    screen-capture.js    # Screenshot service
    gemini-service.js    # Gemini API integration
  /utils
    config.js            # Configuration management
    hotkeys.js           # Global hotkey registration
  /styles
    app.css              # Main styles
/resources
  image.png              # UI reference (already exists)
```

### Step 1.4: Create .gitignore
```
node_modules/
dist/
build/
*.log
config.json
.env
.DS_Store
```

### Step 1.5: Configure Vite
Create `vite.config.js` for building the renderer process:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## Phase 2: Electron Window Setup

### Step 2.1: Create Main Process Entry (`src/main/main.js`)

**Key responsibilities:**
- Initialize Electron app
- Create transparent, frameless, always-on-top window
- Handle app lifecycle events
- Register global hotkeys
- Set up IPC handlers

**Window configuration:**
```javascript
const mainWindow = new BrowserWindow({
  width: 600,
  height: 800,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  resizable: true,
  skipTaskbar: false,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
  },
})
```

### Step 2.2: Create Preload Script (`src/main/preload.js`)

Expose safe IPC channels to renderer:
- `capture-screen` - Trigger screenshot
- `send-message` - Send message to Gemini
- `save-config` - Save API key
- `load-config` - Load API key
- `new-chat` - Clear chat and screenshot
- `toggle-visibility` - Show/hide window

### Step 2.3: Implement Window Manager (`src/main/window-manager.js`)

**Functions:**
- `createMainWindow()` - Create the overlay window
- `toggleWindowVisibility()` - Show/hide toggle
- `getWindowBounds()` - Get current position/size
- `setWindowBounds()` - Restore position/size

### Step 2.4: Implement Global Hotkeys (`src/utils/hotkeys.js`)

Register global shortcuts:
- **Ctrl+/**: Toggle window visibility
- **Ctrl+R**: New chat (send IPC to renderer)

Use Electron's `globalShortcut` API.

### Step 2.5: Make Window Draggable

In the renderer, add drag functionality:
```css
.title-bar {
  -webkit-app-region: drag;
}
.title-bar button {
  -webkit-app-region: no-drag;
}
```

---

## Phase 3: Screen Capture Service

### Step 3.1: Implement Screen Capture (`src/services/screen-capture.js`)

**Key functions:**
- `captureScreen(displayId)` - Capture screenshot
- `getDisplays()` - Get list of available displays
- `compressImage(buffer)` - Compress to <5MB
- `excludeWindow(windowId)` - Exclude overlay from capture

**Implementation approach:**
1. Use `screenshot-desktop` library
2. Before capture, hide the overlay window or minimize it
3. Capture the screen
4. Restore the overlay window
5. Compress image if needed
6. Convert to base64 for Gemini API

### Step 3.2: Create IPC Handler for Screen Capture (`src/main/ipc-handlers.js`)

```javascript
ipcMain.handle('capture-screen', async (event, displayId) => {
  // Hide overlay temporarily
  const window = BrowserWindow.fromWebContents(event.sender)
  window.hide()

  // Wait a moment for window to hide
  await new Promise(resolve => setTimeout(resolve, 100))

  // Capture screen
  const screenshot = await captureScreen(displayId)

  // Show overlay again
  window.show()

  return screenshot
})
```

### Step 3.3: Handle Multi-Monitor Support

- Detect available displays
- Store user's preferred display in config
- Provide display selector in settings

---

## Phase 4: Gemini API Integration

### Step 4.1: Implement Gemini Service (`src/services/gemini-service.js`)

**Key functions:**
- `initializeGemini(apiKey)` - Initialize Gemini client
- `sendMessage(text, imageBase64)` - Send multimodal request
- `streamResponse(text, imageBase64, onChunk)` - Streaming response
- `validateApiKey(apiKey)` - Test API key validity

**Implementation:**
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai'

class GeminiService {
  constructor() {
    this.genAI = null
    this.model = null
  }

  initialize(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    })
  }

  async sendMessage(text, imageBase64 = null) {
    const parts = [{ text }]

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64
        }
      })
    }

    const result = await this.model.generateContentStream(parts)
    return result.stream
  }
}
```

### Step 4.2: Create IPC Handler for Gemini Messages

```javascript
ipcMain.handle('send-message', async (event, { text, image }) => {
  const apiKey = loadApiKey()
  const gemini = new GeminiService()
  gemini.initialize(apiKey)

  // Return stream chunks via IPC
  const stream = await gemini.sendMessage(text, image)

  for await (const chunk of stream) {
    event.sender.send('message-chunk', chunk.text())
  }

  event.sender.send('message-complete')
})
```

### Step 4.3: Error Handling

Handle common errors:
- Invalid API key
- Rate limiting
- Network errors
- API quota exceeded
- Malformed requests

---

## Phase 5: Chat UI Implementation

### Step 5.1: Create Main App Component (`src/renderer/App.jsx`)

**Structure:**
```jsx
function App() {
  const [messages, setMessages] = useState([])
  const [screenshot, setScreenshot] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="app">
      {showSettings ? (
        <Settings onClose={() => setShowSettings(false)} />
      ) : (
        <>
          <TitleBar onSettingsClick={() => setShowSettings(true)} />
          <Chat messages={messages} isLoading={isLoading} />
          <InputBar
            onSendMessage={handleSendMessage}
            onCaptureScreen={handleCaptureScreen}
            hasScreenshot={!!screenshot}
          />
        </>
      )}
    </div>
  )
}
```

### Step 5.2: Implement Chat Component (`src/renderer/components/Chat.jsx`)

**Features:**
- Message list with auto-scroll
- User messages (right-aligned, blue)
- AI messages (left-aligned, gray)
- Screenshot attachment indicator
- Streaming message updates

### Step 5.3: Implement Message Component (`src/renderer/components/Message.jsx`)

**Message types:**
- User message
- AI message
- System message (e.g., "Screenshot attached")

**Props:**
- `content` - Message text
- `role` - "user" | "assistant" | "system"
- `hasScreenshot` - Boolean for attachment indicator
- `timestamp` - Message timestamp

### Step 5.4: Implement Input Bar (`src/renderer/components/InputBar.jsx`)

**Features:**
- Text input field with placeholder
- "Use Screen" button (blue when no screenshot, gray when attached)
- Send button (arrow icon)
- Enter key to send
- Shift+Enter for new line

**UI elements (based on reference image):**
```jsx
<div className="input-bar">
  <button
    className={`screen-button ${hasScreenshot ? 'active' : ''}`}
    onClick={onCaptureScreen}
  >
    📷 Use Screen
  </button>

  <input
    type="text"
    placeholder="Ask about your screen or conversation, or ↩ for Assist"
    value={inputText}
    onChange={e => setInputText(e.target.value)}
    onKeyDown={handleKeyDown}
  />

  <button className="send-button" onClick={handleSend}>
    ➤
  </button>
</div>
```

### Step 5.5: Implement Title Bar (`src/renderer/components/TitleBar.jsx`)

**Features:**
- Home/Settings icon button
- Draggable area
- Close/minimize buttons (optional)

### Step 5.6: Style the UI (`src/styles/app.css`)

**Key styles:**
- Translucent dark background (`rgba(20, 20, 30, 0.95)`)
- Rounded corners
- Blue accent color for active elements (`#4A9EFF`)
- Smooth scrolling
- Message bubbles with proper spacing
- Draggable title bar

**Reference:**
- Use `/resources/image.png` for visual guidance
- Dark theme with slight transparency
- Subtle shadows and borders

---

## Phase 6: Settings Panel

### Step 6.1: Implement Settings Component (`src/renderer/components/Settings.jsx`)

**Settings fields:**
1. **API Key**
   - Text input (password type)
   - Save button
   - Validation indicator

2. **Display Selection** (for multi-monitor)
   - Dropdown with available displays
   - Preview button to test

3. **Model Selection** (optional)
   - Dropdown: gemini-1.5-flash, gemini-1.5-pro
   - Cost/speed trade-off info

**UI:**
```jsx
<div className="settings-panel">
  <h2>Settings</h2>

  <div className="setting-group">
    <label>Gemini API Key</label>
    <input
      type="password"
      value={apiKey}
      onChange={e => setApiKey(e.target.value)}
    />
    <button onClick={handleSaveApiKey}>Save</button>
  </div>

  <div className="setting-group">
    <label>Display</label>
    <select value={displayId} onChange={handleDisplayChange}>
      {displays.map(d => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  </div>

  <button onClick={onClose}>Close</button>
</div>
```

### Step 6.2: Implement Config Management (`src/utils/config.js`)

Use `electron-store` for persistent storage:
```javascript
const Store = require('electron-store')

const store = new Store({
  schema: {
    apiKey: { type: 'string' },
    displayId: { type: 'string' },
    modelName: { type: 'string', default: 'gemini-1.5-flash' },
    windowBounds: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' }
      }
    }
  }
})

module.exports = {
  getApiKey: () => store.get('apiKey'),
  setApiKey: (key) => store.set('apiKey', key),
  getDisplayId: () => store.get('displayId'),
  setDisplayId: (id) => store.set('displayId', id),
  // ... other config methods
}
```

---

## Phase 7: Application State Management

### Step 7.1: Chat State Management

In `App.jsx`, manage:
- `messages` array - All chat messages
- `screenshot` - Current screenshot (base64)
- `isLoading` - Loading state for AI responses
- `currentResponse` - Streaming response text

### Step 7.2: Screenshot State

- Store screenshot in state when captured
- Display indicator when screenshot is attached
- Clear screenshot on Ctrl+R (new chat)
- Include screenshot in next message to Gemini

### Step 7.3: IPC Communication Flow

**Renderer → Main:**
- `capture-screen` → Returns base64 image
- `send-message` → { text, image } → Streams response
- `save-config` → { key, value }
- `load-config` → { key } → Returns value

**Main → Renderer:**
- `message-chunk` → Streaming text chunks
- `message-complete` → Response finished
- `new-chat` → Clear chat (from Ctrl+R hotkey)

### Step 7.4: Handle New Chat (Ctrl+R)

When Ctrl+R is pressed:
1. Main process sends `new-chat` event
2. Renderer clears messages array
3. Renderer clears screenshot
4. Renderer resets input field
5. UI updates to show empty chat

---

## Phase 8: Polish & Error Handling

### Step 8.1: Error Handling

**Scenarios to handle:**
1. No API key configured → Show settings prompt
2. Invalid API key → Show error message
3. Network error → Retry with exponential backoff
4. Rate limit → Show friendly error
5. Screenshot capture failed → Show error, allow retry
6. Large image → Compress or show warning

### Step 8.2: User Feedback

**Loading states:**
- Show "Thinking..." when AI is processing
- Streaming text should appear character by character
- Screenshot capture should show brief "Capturing..." indicator

**Success states:**
- "Screenshot captured" confirmation
- "API key saved" confirmation

**Error states:**
- Clear error messages with retry options
- API error details in settings panel

### Step 8.3: Performance Optimization

**Image compression:**
- Target <5MB for Gemini API
- Use PNG compression or convert to JPEG
- Resize if resolution is very high

**Memory management:**
- Clear old screenshots from memory
- Limit message history length (e.g., last 50 messages)
- Dispose of image data after sending

**Startup time:**
- Lazy load Gemini API client
- Only initialize when API key is configured

### Step 8.4: UI Polish

**Animations:**
- Smooth message entry animations
- Fade in/out for window toggle
- Button hover effects

**Accessibility:**
- Keyboard shortcuts
- Focus management
- Screen reader support (basic)

---

## Phase 9: Testing

### Step 9.1: Manual Testing Checklist

**Window behavior:**
- [ ] Window is transparent/translucent
- [ ] Window is always on top
- [ ] Window is draggable
- [ ] Window is resizable
- [ ] Ctrl+/ shows/hides window
- [ ] Window position persists

**Screen capture:**
- [ ] Screenshot captures full screen
- [ ] Overlay is excluded from screenshot
- [ ] Multi-monitor selection works
- [ ] Screenshot indicator appears
- [ ] Large images are compressed

**Chat functionality:**
- [ ] Can send text-only messages
- [ ] Can send text + screenshot
- [ ] Streaming responses work
- [ ] Messages display correctly
- [ ] Ctrl+R clears chat and screenshot

**Settings:**
- [ ] Can save API key
- [ ] API key persists after restart
- [ ] Can select display
- [ ] Settings UI is accessible

**Error handling:**
- [ ] Invalid API key shows error
- [ ] Network errors are handled gracefully
- [ ] Rate limiting is handled
- [ ] Screenshot errors show message

### Step 9.2: Edge Cases

- Empty messages (should be blocked)
- Very long messages
- Very large screenshots
- No internet connection
- API key revoked mid-session
- Multiple rapid screenshot captures
- Window minimized during capture

### Step 9.3: Windows-Specific Testing

- Test on Windows 10
- Test on Windows 11
- Multi-monitor setups (2+ displays)
- High DPI displays
- Different screen resolutions

---

## Phase 10: Build & Distribution

### Step 10.1: Configure Electron Builder

Create `electron-builder.json`:
```json
{
  "appId": "com.cluelyclaude.app",
  "productName": "CluelyClaude",
  "directories": {
    "output": "build"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "win": {
    "target": ["nsis"],
    "icon": "resources/icon.ico"
  }
}
```

### Step 10.2: Add Build Scripts

In `package.json`:
```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"electron .\"",
    "build": "vite build && electron-builder",
    "build:win": "vite build && electron-builder --win",
    "start": "electron ."
  }
}
```

### Step 10.3: Create Installer

- Generate Windows installer (.exe)
- Include auto-update functionality (future)
- Sign the application (optional)

---

## Phase 11: Documentation

### Step 11.1: README.md

Include:
- Project description
- Features list
- Installation instructions
- Setup guide (API key)
- Usage instructions
- Keyboard shortcuts
- Troubleshooting

### Step 11.2: User Guide

Create simple user guide:
1. How to get Gemini API key
2. How to configure the app
3. How to use screen capture
4. Keyboard shortcuts reference

---

## Implementation Order Summary

1. ✅ Initialize project, install dependencies
2. ✅ Set up Electron with transparent window
3. ✅ Implement draggable/resizable window
4. ✅ Register global hotkeys (Ctrl+/, Ctrl+R)
5. ✅ Implement screen capture service
6. ✅ Integrate Gemini API
7. ✅ Build chat UI components
8. ✅ Implement settings panel
9. ✅ Add error handling and polish
10. ✅ Test thoroughly
11. ✅ Build and document

---

## Timeline Estimate

- **Day 1**: Phase 1-2 (Setup + Electron window)
- **Day 2**: Phase 3-4 (Screen capture + Gemini)
- **Day 3-4**: Phase 5-6 (Chat UI + Settings)
- **Day 4-5**: Phase 7-8 (State management + Polish)
- **Day 5-6**: Phase 9-11 (Testing + Documentation)

**Total: 5-6 days for MVP**

---

## Next Steps

After MVP is complete, potential enhancements:
- Support for other LLM providers (OpenAI, Anthropic)
- Persistent chat history (optional)
- Custom system prompts
- Screenshot annotations
- Conversation export
- Auto-update functionality
