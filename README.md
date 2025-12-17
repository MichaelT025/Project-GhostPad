# Shade

**The Invisible AI Assistant**

A Windows desktop application providing real-time AI assistance through a translucent, always-on-top overlay. Capture your screen and ask questions - powered by your choice of LLM provider.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Why Shade?

- **Privacy-First** - All data stays on your machine. No telemetry, no cloud sync, no tracking.
- **BYOK (Bring Your Own Key)** - No subscriptions. Use your own API keys and pay only for what you use.
- **Free & Open Source** - MIT licensed, community-driven development.
- **Lightweight** - Minimal, fast, stays out of your way until you need it.
- **Provider Agnostic** - Works with Gemini, OpenAI, Anthropic, or your own local models.

## Features

- **Always-on-top translucent overlay** - Floats above all windows, always accessible
- **Collapsible interface** - Minimal input bar by default, expands when you need it
- **Screen capture** - Overlay automatically excluded from screenshots
- **Multi-provider support** - Gemini, OpenAI, Anthropic, or OpenAI-compatible local models
- **Rich responses** - Markdown, LaTeX math, and syntax highlighting for 50+ languages
- **Session history** - Resume previous conversations (stored locally for 30 days)
- **Keyboard shortcuts** - Toggle visibility, start new chat, collapse/expand

## Installation

### Prerequisites

- Windows 10 (version 2004+) or Windows 11
- Node.js 18+ and npm
- API key from your preferred provider:
  - **Gemini**: [Get API key](https://makersuite.google.com/app/apikey) (free tier available)
  - **OpenAI**: [Get API key](https://platform.openai.com/api-keys)
  - **Anthropic**: [Get API key](https://console.anthropic.com/)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/MichaelT025/Project-GhostPad.git
cd Project-GhostPad

# Install dependencies
npm install

# Start the app
npm start
```

> **Note:** Run from Windows Command Prompt or PowerShell (not Cygwin/Git Bash).

### First-Time Setup

1. Open Shade - you'll see a minimal input bar
2. Click the settings icon
3. Add your API key for your preferred provider
4. Select your model
5. Start chatting!

## Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+/` | Toggle overlay visibility |
| `Ctrl+R` | Start new chat |
| `Ctrl+'` | Toggle collapsed/expanded |

### Basic Workflow

1. **See something on screen you have a question about?**
2. **Press `Ctrl+/`** to show Shade
3. **Click "Use Screen"** to capture a screenshot (or enable auto-capture in settings)
4. **Type your question** and press Enter
5. **Get AI-powered answers** with full context of what's on your screen

### Tips

- Drag the title bar to reposition
- Resize by dragging edges (when expanded)
- Screenshots persist until you start a new chat
- Use `/models` in the input to quickly switch models

## Technology

- **Framework:** Electron
- **UI:** Vanilla JavaScript/HTML/CSS
- **LLM Providers:** Gemini, OpenAI, Anthropic, OpenAI-compatible endpoints
- **Screen Capture:** Electron's `desktopCapturer` with `setContentProtection`
- **Rendering:** marked.js (Markdown), KaTeX (LaTeX), highlight.js (code)

## Privacy & Security

Shade is designed with privacy as a core principle:

- **Local Storage Only** - Config and sessions stored in your user data directory
- **No Cloud Sync** - Nothing leaves your machine except API calls to your chosen provider
- **No Telemetry** - We don't track usage, collect analytics, or phone home
- **You Control the Data** - Screenshots sent directly to LLM, then discarded
- **Open Source** - Audit the code yourself

## Development

### Project Structure

```
/src
  /main           - Electron main process
  /renderer       - UI (HTML, JS, CSS)
  /services       - LLM providers, config, screen capture
/docs             - Documentation and plans
```

### Commands

```bash
npm start         # Run in development mode
npm test          # Run unit tests
npm run build:win # Build Windows executable
```

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, testing/build commands, and pull request guidelines.

## Roadmap

### V1.0 (Current)
- [x] Multi-provider LLM support
- [x] Screen capture with overlay exclusion
- [x] Rich text rendering (Markdown, LaTeX, code)
- [ ] Collapsible overlay
- [ ] Session history
- [ ] Local model support
- [ ] Model switcher

### V1.1
- [ ] macOS support
- [ ] Linux support
- [ ] Automatic screenshot mode
- [ ] Usage/cost tracking
- [ ] File attachments
### V2.0+
- [ ] Agentic actions (MCP)
- [ ] Calendar/email integration

See [PRD.md](docs/PRD.md) for the complete product roadmap.

## Troubleshooting

### Overlay appears in screenshots
You need Windows 10 version 2004 (May 2020) or later. Update Windows if on an older version.

### App won't start from Git Bash
Electron doesn't work in Cygwin terminals. Use Command Prompt or PowerShell.

### API key not saving
Check write permissions in your user data directory.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- LLM Providers: [Google Gemini](https://deepmind.google/technologies/gemini/), [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/)
- Image processing: [Sharp](https://sharp.pixelplumbing.com/)

---

**Made for Windows users who want AI assistance without the bloat.**
