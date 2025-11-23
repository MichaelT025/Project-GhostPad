# GhostPad

A Windows desktop application providing real-time AI assistance through a translucent overlay. Capture your screen and ask questions powered by Google's Gemini API.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

GhostPad is a lightweight, privacy-focused desktop assistant that stays on top of your work. Capture screenshots, ask questions about what you see, and get AI-powered answers - all without leaving your workflow.

**Core Features:**
- 🪟 Always-on-top translucent overlay
- 📸 Instant screen capture (overlay automatically excluded)
- 🤖 AI-powered responses via Google Gemini
- 🔒 Privacy-first: no data persistence
- ⌨️ Global keyboard shortcuts
- 🎯 Lightweight and fast

## Screenshots

> Coming soon

## Installation

### Prerequisites

- Windows 10 (version 2004 or later) or Windows 11
- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ghostpad.git
   cd ghostpad
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

   **Important:** Run from Windows Command Prompt or PowerShell (not Cygwin/Git Bash due to Electron compatibility).

4. **Configure your API key**
   - Click the settings icon in the overlay
   - Enter your Gemini API key
   - Click Save

## Usage

### Keyboard Shortcuts

- **Ctrl + /** - Toggle overlay visibility (show/hide)
- **Ctrl + R** - Start new chat (clears conversation and screenshot)

### Basic Workflow

1. **Capture a screenshot**
   - Click the "Use Screen" button
   - The overlay will be automatically excluded from the capture
   - You'll see a confirmation when the screenshot is attached

2. **Ask a question**
   - Type your question in the input field
   - Press Enter or click the send button
   - The AI will analyze both your question and the screenshot

3. **Get answers**
   - Responses stream in real-time
   - Continue the conversation with follow-up questions
   - The screenshot remains attached until you start a new chat (Ctrl+R)

### Tips

- The overlay is draggable - click and drag the title bar to reposition
- The overlay is resizable - drag the edges to adjust size
- Screenshots are compressed automatically for faster API transmission
- Press Ctrl+R to clear everything and start fresh

## Technology Stack

- **Framework:** Electron v32.2.7
- **UI:** Vanilla JavaScript/HTML/CSS
- **Build Tool:** Vite
- **AI Provider:** Google Gemini API (`@google/generative-ai`)
- **Screen Capture:** Electron's `desktopCapturer` API
- **Image Processing:** Sharp (for compression)

## Development

### Project Structure

```
/src
  /main           - Electron main process
    main.js       - App entry, window management, IPC handlers
    preload.js    - Context bridge for secure IPC
  /renderer       - UI components
    index.html    - Overlay interface
  /services       - Core functionality
    screen-capture.js  - Screenshot capture & compression
    gemini-service.js  - Gemini API integration (planned)
  /utils          - Helper functions
/resources        - Assets and UI references
/testing          - Development screenshots (auto-saved in dev mode)
```

### Development Mode

Run the app in development mode:

```bash
npm start
```

In development mode (`NODE_ENV !== 'production'`):
- Screenshots are automatically saved to `testing/screenshots/` with timestamps
- DevTools are opened automatically for debugging
- All files in `testing/` are excluded from git

### Building for Production

```bash
npm run build      # Build for current platform
npm run build:win  # Build for Windows specifically
```

The built application will be in the `build/` directory.

## Architecture Highlights

### Screen Capture

GhostPad uses a sophisticated approach to exclude the overlay from screenshots:

- **Window Exclusion:** Uses `setContentProtection(true)` API (Windows 10 v2004+)
- **Instant Capture:** Electron's `desktopCapturer` captures screens without hiding the overlay
- **High-DPI Support:** Captures at 3840x2160 resolution for sharp screenshots
- **Smart Compression:** Resizes to max 1920px width, compresses to JPEG (quality 80-85)
- **Target Size:** Keeps images under 5MB for Gemini API compatibility

### Privacy & Security

- **No Persistence:** Screenshots are never saved to disk (except in dev mode for debugging)
- **Session-Only History:** Chat history exists only in memory, cleared on new chat or app restart
- **Local API Keys:** Your Gemini API key is stored locally in a config file (never transmitted to us)
- **User-Controlled Capture:** Screenshots only happen when you click the button
- **Excluded from Git:** Config files with API keys are in `.gitignore`

## Current Status

**Completed:**
- ✅ Electron window with translucent overlay
- ✅ Draggable and resizable window
- ✅ Global hotkeys (Ctrl+/, Ctrl+R)
- ✅ Screen capture with overlay exclusion
- ✅ Image compression and optimization
- ✅ Development mode debugging features

**In Progress:**
- ⏳ Gemini API integration
- ⏳ Chat UI implementation
- ⏳ Settings panel

**Planned:**
- ⬜ Streaming responses
- ⬜ Multi-monitor support
- ⬜ Error handling and user feedback
- ⬜ Installer for Windows

## Troubleshooting

### Overlay not excluded from screenshots

**Issue:** The overlay appears in screenshots.

**Solution:** You need Windows 10 version 2004 (May 2020 Update) or later for `setContentProtection()` to work. Update Windows if you're on an older version.

### "Cannot read properties of undefined" error

**Issue:** Error when starting the app from Cygwin or Git Bash.

**Solution:** Electron doesn't work correctly in Cygwin terminals. Use Windows Command Prompt or PowerShell instead:
```cmd
npm start
```

### Screenshots are too large

**Issue:** Screenshots exceed 5MB and take too long to upload.

**Solution:** The app automatically compresses images. If you're still experiencing issues, you may have an extremely high-resolution display. This is handled automatically in the compression logic.

### API key not saving

**Issue:** API key doesn't persist after restart.

**Solution:** Make sure the app has write permissions in its directory. The config file is stored in your user data directory.

## Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it into GhostPad's settings
5. The key is stored locally and never leaves your machine

**Note:** Gemini API has free tier limits. Monitor your usage in the [Google Cloud Console](https://console.cloud.google.com/).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Complete Gemini API integration with streaming
- [ ] Implement full chat UI
- [ ] Add settings panel for API key and preferences
- [ ] Multi-monitor support with display selection
- [ ] Support for additional LLM providers (OpenAI, Anthropic)
- [ ] Custom system prompts
- [ ] Screenshot annotations
- [ ] Conversation export
- [ ] Auto-update functionality
- [ ] macOS and Linux support (future)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- Image processing by [Sharp](https://sharp.pixelplumbing.com/)

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the [Troubleshooting](#troubleshooting) section above
- Review the project documentation in `CLAUDE.md` and `plan.md`

---

**Made with ☕ for Windows users who want AI assistance without the bloat.**
