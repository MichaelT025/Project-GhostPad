# Contributing to Shade

Thanks for your interest in contributing to Shade!

## Quick start (local development)

### Prerequisites

- Windows 10 (version 2004+) or Windows 11
- Node.js 18+

### Setup

1. Fork the repository on GitHub
2. Clone your fork
3. Install dependencies

```bash
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

## Building

```bash
npm run build:win
```

## Making changes

- Create a feature branch from your default branch:

```bash
git checkout -b feat/your-feature-name
```

- Keep changes focused and scoped to a single purpose.
- If you change behavior, include a test when it’s practical.

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
