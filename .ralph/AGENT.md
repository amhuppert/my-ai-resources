# Ralph Agent Configuration

## Build Instructions

```bash
# Navigate to voice-to-text directory and build
cd voice-to-text && bun run build
```

## Test Instructions

```bash
# Run unit tests
cd voice-to-text && bun test

# Run development mode for manual testing
cd voice-to-text && bun run dev listen
```

## Run Instructions

```bash
# Run listen mode (hotkey-driven recording)
voice-to-text listen

# Run server mode (HTTP API)
voice-to-text serve

# Or run directly from dist/
./voice-to-text/dist/voice-to-text listen
```

## Install Instructions

```bash
# Install dependencies
cd voice-to-text && bun install

# Run installer script
cd voice-to-text && bun run install-tool
```

## Environment Setup

Required environment variables:

- `OPENAI_API_KEY` - OpenAI API key for transcription

System dependencies:

- **Mac**: `brew install sox`
- **Linux**: `sudo apt install alsa-utils`

## Notes

- Build output goes to voice-to-text/dist/voice-to-text
- Binary installs to ~/.local/bin/voice-to-text
- Config stored at ~/.config/voice-to-text/config.json
- Assets copied to ~/.config/voice-to-text/assets/
