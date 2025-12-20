# Contributing to Shade

Thanks for your interest in contributing to Shade!

## Quick start (local development)

### Prerequisites

- Windows 10 (version 2004+) or Windows 11 (primary supported platform)
- Node.js 18+ (npm comes with Node)

> Note: There is some macOS compatibility work in the codebase (icons + shortcut conflicts), but official packaged macOS releases are not currently a target.


### Setup

1. Fork the repository on GitHub
2. Clone your fork
3. Install dependencies

```bash
npm install
```

If you’re cloning the upstream repo directly:

```bash
git clone https://github.com/MichaelT025/Shade.git
cd Shade
npm install
```


### Run the app

- Dev mode (recommended):

```bash
npm run dev
```

- Start Electron only:

```bash
npm start
```

## Testing

```bash
npm test
```

Other available test commands:

```bash
npm run test:run
npm run test:ui
npm run test:coverage
```

## Docs

- `README.md` for the user-facing overview
- `docs/PRD.md` for product requirements and scope
- `docs/CONFIGURATION.md` for provider/config details
- `docs/TESTS_SETUP.md` for a deeper test walkthrough

## Building


- Windows installer (NSIS):

```bash
npm run build:win
```

- Full build (electron-builder default targets for your OS):

```bash
npm run build
```


## Making changes

- Create a feature branch from your default branch:

```bash
git checkout -b feat/your-feature-name
```

- Keep changes focused and scoped to a single purpose.
- Prefer small PRs with a clear reason (“why”) in the description.
- If you change behavior, include a test when it’s practical.
- If you touch persistence/config:
  - Sessions and screenshots are stored under the Electron `userData` folder (see `src/services/session-storage.js` and `src/services/config-service.js`).
  - Be careful not to introduce migrations that can delete user data.


## Commit messages

- Use clear, descriptive messages in the imperative mood.
- Keep commits small and logically grouped.

## Pull requests

Please include:

- A short description of what changed and why
- Steps to test the change locally
- Screenshots or screen recordings for UI/UX changes (redact sensitive information)

## Reporting bugs / requesting features

When filing an issue, include:

- What you expected to happen vs what happened
- Reproduction steps
- Your OS version (Windows 10/11) and Node.js version
- Logs or error output if available

## Security & privacy

- Do not commit API keys, tokens, or personal data.
- If you discover a security issue, avoid filing it publicly with sensitive details—share a minimal reproduction and wait for guidance.
