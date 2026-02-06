# Voice-to-Text CLI

A command-line tool for capturing voice input and converting it to AI-ready formatted text. Records audio via hotkey, transcribes with OpenAI, cleans up with Claude, and copies to clipboard.

## Features

- **Global hotkey activation** - Press F9 from any application (macOS, Linux)
- **OpenAI transcription** - Uses gpt-4o-transcribe for accurate speech-to-text
- **Claude cleanup** - Automatically formats and corrects transcription errors
- **Clipboard integration** - Result is copied and ready to paste
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
voice-to-text
```

## Configuration

### Config File Location

`~/.config/voice-to-text/config.json`

### Configuration Options

| Option                  | Type    | Default | Description                                 |
| ----------------------- | ------- | ------- | ------------------------------------------- |
| `hotkey`                | string  | `"F9"`  | Global hotkey to toggle recording           |
| `contextFile`           | string  | -       | Path to context file for Claude cleanup     |
| `claudeModel`           | string  | -       | Claude model to use for text cleanup        |
| `autoInsert`            | boolean | `true`  | Auto-insert cleaned text at cursor position |
| `beepEnabled`           | boolean | `true`  | Play audio feedback sounds                  |
| `notificationEnabled`   | boolean | `true`  | Show desktop notifications                  |
| `terminalOutputEnabled` | boolean | `true`  | Print status messages to terminal           |
| `maxRecordingDuration`  | number  | `300`   | Maximum recording duration in seconds       |

### Example Configuration

```json
{
  "hotkey": "F9",
  "contextFile": "/path/to/project/context.md",
  "claudeModel": "claude-sonnet-4-5-20250929",
  "autoInsert": true,
  "beepEnabled": true,
  "notificationEnabled": true,
  "terminalOutputEnabled": true,
  "maxRecordingDuration": 300
}
```

### Context File

The optional `contextFile` provides project context to Claude for better cleanup. Include relevant terminology, coding conventions, or domain-specific vocabulary.

## Usage

### Starting the Tool

```bash
voice-to-text
```

Output (global hotkey mode):

```
Voice-to-text ready. Press F9 to start recording.
```

Output (terminal input mode):

```
Voice-to-text ready. Press Enter or Space to toggle recording. (Ctrl+C to exit)
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
bun run dev
```

### Project Structure

```
voice-to-text/
├── src/
│   ├── main.ts              # Entry point, state machine
│   ├── types.ts             # Type definitions
│   ├── services/
│   │   ├── audio-recorder.ts   # Microphone capture
│   │   ├── transcriber.ts      # OpenAI API integration
│   │   ├── cleanup.ts          # Claude CLI integration
│   │   ├── clipboard.ts        # Clipboard operations
│   │   ├── cursor-insert.ts    # Auto-insert at cursor position
│   │   └── feedback.ts         # Notifications and sounds
│   └── utils/
│       ├── config.ts           # Configuration loading
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
