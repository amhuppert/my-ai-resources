# Voice-to-Text CLI

A command-line tool for capturing voice input and converting it to AI-ready formatted text. Two modes: `listen` for hotkey-driven voice recording, `serve` for HTTP API access.

## Features

- **Two operating modes** - `listen` (hotkey-driven) and `serve` (HTTP API)
- **Global hotkey activation** - Press F9/F10 from any application (macOS, Linux)
- **Dual output modes** - Clipboard (F9) or file append with continuity (F10)
- **OpenAI transcription** - Uses gpt-4o-transcribe for accurate speech-to-text
- **Multi-format audio** - WAV, WebM, MP3, OGG, FLAC, M4A
- **Claude cleanup** - Automatically formats and corrects transcription errors
- **Project-scoped config** - Per-project `voice.json` with context and instructions
- **HTTP server mode** - REST API for browser extensions, editor plugins, and other tools
- **Desktop notifications** - Visual feedback for recording states
- **Audio feedback** - Beep sounds indicate recording start/stop

## Requirements

### System Requirements

| Platform         | Hotkey Support              | Requirement              |
| ---------------- | --------------------------- | ------------------------ |
| macOS            | Global (F9)                 | None                     |
| Linux            | Global (F9)                 | `input` group membership |
| Linux (fallback) | Terminal only (Enter/Space) | None                     |

### External Dependencies

| Platform              | Package    | Install Command               |
| --------------------- | ---------- | ----------------------------- |
| macOS                 | sox        | `brew install sox`            |
| Linux (Debian/Ubuntu) | alsa-utils | `sudo apt install alsa-utils` |
| Linux (Arch)          | alsa-utils | `sudo pacman -S alsa-utils`   |

### Environment Variables

| Variable         | Required | Description                      |
| ---------------- | -------- | -------------------------------- |
| `OPENAI_API_KEY` | Yes      | OpenAI API key for transcription |

### Optional Dependencies

- **Claude Code CLI** - Required for text cleanup. Without it, raw transcription is copied to clipboard.

## Installation

### From Source

```bash
# Clone the repository
git clone <repository-url>
cd my-ai-resources/voice-to-text

# Install dependencies
bun install

# Run the installer
bun run scripts/install.ts
```

The installer will:

1. Check for system dependencies (sox/arecord)
2. Verify OPENAI_API_KEY is set
3. Build the binary
4. Copy to `~/.local/bin/voice-to-text`
5. Create config directory at `~/.config/voice-to-text/`
6. Copy audio assets

### Verify Installation

```bash
# Ensure ~/.local/bin is in your PATH
voice-to-text --help
```

## Configuration

### Config Resolution Order

Configuration is resolved from multiple sources, with higher-priority sources overriding lower-priority ones (per-key):

1. **CLI arguments** (highest priority) - `--hotkey`, `--no-beep`, etc.
2. **`--config <path>` file** - Explicitly specified config file
3. **Local `voice.json`** - Automatically detected in the current working directory
4. **Global config** (lowest priority) - `~/.config/voice-to-text/config.json`

### Global Config File

`~/.config/voice-to-text/config.json`

### Local Config File

Place a `voice.json` file in your project directory to override global settings for that project. This file is automatically detected when you run `voice-to-text listen` from that directory, or when a server request includes the `projectPath` parameter.

```json
{
  "contextFile": "./context.md",
  "instructionsFile": "./instructions.md",
  "beepEnabled": false
}
```

If the file contains invalid JSON or fails validation, a warning is printed to stderr and the file is skipped.

### Configuration Options

| Option                  | Type    | Default | Description                                  |
| ----------------------- | ------- | ------- | -------------------------------------------- |
| `hotkey`                | string  | `"F9"`  | Global hotkey to toggle recording            |
| `contextFile`           | string  | -       | Path to context file for Claude cleanup      |
| `instructionsFile`      | string  | -       | Path to instructions file for Claude cleanup |
| `claudeModel`           | string  | -       | Claude model to use for text cleanup         |
| `autoInsert`            | boolean | `true`  | Auto-insert cleaned text at cursor position  |
| `beepEnabled`           | boolean | `true`  | Play audio feedback sounds                   |
| `notificationEnabled`   | boolean | `true`  | Show desktop notifications                   |
| `terminalOutputEnabled` | boolean | `true`  | Print status messages to terminal            |
| `maxRecordingDuration`  | number  | `300`   | Maximum recording duration in seconds        |

### Example Configuration

```json
{
  "hotkey": "F9",
  "contextFile": "/path/to/project/context.md",
  "instructionsFile": "/path/to/cleanup-instructions.md",
  "claudeModel": "claude-sonnet-4-5-20250929",
  "autoInsert": true,
  "beepEnabled": true,
  "notificationEnabled": true,
  "terminalOutputEnabled": true,
  "maxRecordingDuration": 300
}
```

### Context File

The optional `contextFile` provides project context to Claude for better cleanup. Include relevant terminology, coding conventions, or domain-specific vocabulary. The context is included in the prompt as background information.

### Instructions File

The optional `instructionsFile` provides custom cleanup instructions to Claude. Use this to control _how_ the text is cleaned up (e.g., "always use bullet points", "preserve code snippets verbatim"). Custom instructions are placed before the default instructions so they take priority.

**Context file vs Instructions file:**

- **Context file** — _what_ the project is about (terminology, domain knowledge)
- **Instructions file** — _how_ to clean up the text (formatting rules, style preferences)

## Usage

### CLI Options

#### `listen` subcommand

All configuration options can be overridden via command-line arguments. CLI arguments take precedence over all config file values.

```
Usage: voice-to-text listen [options]

Options:
  --config <path>              Path to configuration file
  --hotkey <key>               Global hotkey to toggle recording
  --file-hotkey <key>          Global hotkey for file output mode
  --context-file <path>        Path to context file for Claude cleanup
  --instructions-file <path>   Path to instructions file for Claude cleanup
  --output-file <path>         Path to output file for file mode
  --claude-model <model>       Claude model for cleanup step
  --no-auto-insert             Disable auto-insert at cursor
  --no-beep                    Disable audio feedback
  --no-notification            Disable desktop notifications
  --no-terminal-output         Disable terminal output
  --max-duration <seconds>     Maximum recording duration in seconds
  --verbose                    Enable verbose logging
  --clear-output               Clear output file on startup
  -h, --help                   display help for command
```

#### `serve` subcommand

```
Usage: voice-to-text serve [options]

Options:
  -p, --port <port>   Server port (default: 7880)
  --host <host>       Server host (default: "127.0.0.1")
  --verbose           Enable verbose logging
  -h, --help          display help for command
```

### Examples

```bash
# Listen mode with default config
voice-to-text listen

# Override hotkey and disable beeps
voice-to-text listen --hotkey F10 --no-beep

# Use a specific config file
voice-to-text listen --config ~/projects/my-app/voice-config.json

# Specify context and instructions files
voice-to-text listen --context-file ./context.md --instructions-file ./instructions.md

# Use a specific Claude model
voice-to-text listen --claude-model claude-sonnet-4-5-20250929

# Start the HTTP server on default port
voice-to-text serve

# Start server on custom port
voice-to-text serve --port 9000 --verbose
```

### Starting Listen Mode

```bash
voice-to-text listen
```

Output (global hotkey mode):

```
Voice-to-text ready. Press F9 to start recording.
```

Output (terminal input mode):

```
Voice-to-text ready. Press Enter or Space to toggle recording. (Ctrl+C to exit)
```

### Starting Server Mode

```bash
voice-to-text serve
```

Output:

```
Voice2Text server listening on http://127.0.0.1:7880
```

Transcribe via curl:

```bash
curl -X POST http://127.0.0.1:7880/transcribe \
  -F "audio=@recording.webm" \
  -F "projectPath=/path/to/project"
```

### Recording Workflow

1. **Start recording** - Press F9 (or Enter/Space in terminal mode)
   - Beep sound plays
   - "Recording started" notification appears
   - Terminal shows "Recording..."

2. **Speak your message** - Talk naturally into your microphone

3. **Stop recording** - Press F9 again (or Enter/Space)
   - Beep sound plays
   - "Processing..." notification appears

4. **Wait for processing** - Tool transcribes and cleans up text
   - Terminal shows transcription preview
   - Terminal shows cleanup preview

5. **Use the result** - Text is copied to clipboard
   - "Copied to clipboard" notification appears
   - Paste with Ctrl+V / Cmd+V

### Stopping the Tool

Press `Ctrl+C` in the terminal to exit.

## Platform Notes

### macOS

- Global hotkey works via IOKit (`node-global-key-listener`)
- No additional permissions required
- Works regardless of which application has focus

### Linux

Global hotkey reads keyboard events directly from `/dev/input` (kernel input subsystem). This works on both X11 and Wayland.

**Setup (one-time):**

```bash
# Add yourself to the input group
sudo usermod -a -G input $USER

# Log out and back in (or reboot) for the change to take effect
```

**Verify:**

```bash
# Confirm group membership
groups | grep input
```

**How it works:**

- Scans `/proc/bus/input/devices` to find the keyboard device
- Opens the corresponding `/dev/input/eventN` device for reading
- Parses kernel `input_event` structs to detect the configured hotkey
- Works globally regardless of focused window or display server

**Supported hotkeys:** F1-F12, Space, Enter

### Linux (fallback mode)

If `/dev/input` is not accessible (user not in `input` group, or no keyboard device found), the tool falls back to terminal input mode:

- Terminal window must have focus to capture keypresses
- Use Enter or Space to toggle recording
- Press Ctrl+C to exit

## Troubleshooting

### "OPENAI_API_KEY environment variable is not set"

Export your OpenAI API key:

```bash
export OPENAI_API_KEY="sk-..."
```

Add to your shell profile (`~/.bashrc`, `~/.zshrc`) for persistence.

### "Global hotkey unavailable: permission denied on /dev/input"

Your user is not in the `input` group. Fix with:

```bash
sudo usermod -a -G input $USER
# Log out and back in for the change to take effect
```

### "Global hotkey unavailable: No keyboard input device found"

The tool could not find a keyboard in `/proc/bus/input/devices`. Check that your kernel exposes input devices:

```bash
cat /proc/bus/input/devices | grep -A 2 keyboard
```

### "Global hotkey unavailable: Unsupported hotkey"

The configured hotkey is not in the supported set. Supported hotkeys: F1-F12, Space, Enter. Update your config file at `~/.config/voice-to-text/config.json`.

### Recording doesn't start / No audio captured

1. Verify audio tools are installed:

   ```bash
   # macOS
   which sox

   # Linux
   which arecord
   ```

2. Test microphone directly:

   ```bash
   # macOS
   sox -d test.wav trim 0 5

   # Linux
   arecord -d 5 test.wav
   ```

3. Check microphone permissions in system settings.

### Claude cleanup not working

1. Verify Claude Code CLI is installed:

   ```bash
   which claude
   ```

2. If not installed, the tool will copy raw transcription to clipboard (still functional, just unformatted).

### Notifications not appearing

1. Check system notification settings
2. Verify `notificationEnabled` is `true` in config
3. On Linux, ensure a notification daemon is running (e.g., `dunst`, `mako`)

### Cursor auto-insert not working

The auto-insert feature requires a platform-specific typing tool:

| Platform        | Required Tool | Install Command            |
| --------------- | ------------- | -------------------------- |
| Linux (X11)     | `xdotool`     | `sudo apt install xdotool` |
| Linux (Wayland) | `wtype`       | `sudo apt install wtype`   |
| macOS           | `osascript`   | Pre-installed              |

If the tool is not installed, the text is still copied to clipboard — auto-insert fails gracefully with a warning.

To disable auto-insert entirely, set `"autoInsert": false` in your config.

## Development

### Building from Source

```bash
cd voice-to-text
bun install
bun run build
```

Binary is output to `dist/voice-to-text`.

### Running in Development Mode

```bash
bun run dev listen        # Listen mode
bun run serve             # Server mode
```

### Project Structure

```
voice-to-text/
├── src/
│   ├── main.ts              # Entry point, subcommand routing
│   ├── server.ts            # HTTP server (serve subcommand)
│   ├── types.ts             # Type definitions
│   ├── services/
│   │   ├── audio-recorder.ts   # Microphone capture
│   │   ├── transcriber.ts      # OpenAI API integration (multi-format)
│   │   ├── cleanup.ts          # Claude CLI integration
│   │   ├── clipboard.ts        # Clipboard operations
│   │   ├── cursor-insert.ts    # Auto-insert at cursor position
│   │   ├── file-output.ts      # File append output
│   │   ├── last-transcription.ts # Last transcription store
│   │   └── feedback.ts         # Notifications and sounds
│   └── utils/
│       ├── config.ts           # Configuration loading
│       ├── context.ts          # Context file reading
│       ├── hotkey.ts           # Global hotkey listener
│       └── wav-encoder.ts      # Audio format conversion
├── assets/
│   ├── start.wav            # Recording start sound
│   └── stop.wav             # Recording stop sound
├── scripts/
│   └── install.ts           # Installation script
└── dist/
    └── voice-to-text        # Compiled binary
```
