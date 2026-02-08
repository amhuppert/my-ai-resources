# Gum Reference Guide for AI Agents

<Overview>
Gum is a CLI tool by Charmbracelet for building interactive shell scripts without writing Go code. It provides composable commands (input prompts, selection lists, spinners, styled text) that capture user input to stdout, enabling rich TUI workflows from plain bash scripts.
</Overview>

## Installation

```bash
# macOS / Linux
brew install gum

# Arch Linux
pacman -S gum

# Fedora / EPEL
dnf install gum

# Nix
nix-env -iA nixpkgs.gum

# Windows
winget install charmbracelet.gum
# or
scoop install charm-gum

# From source (requires Go)
go install github.com/charmbracelet/gum@latest
```

## Core Concepts

- Each gum command is a standalone TUI component invoked as a subcommand
- User selections and input are written to **stdout** — capture with `$(gum ...)`
- Exit codes convey meaning: `gum confirm` returns 0 (yes) or 1 (no)
- All flags have matching **environment variables**: pattern `GUM_COMMAND_FLAG` (e.g., `GUM_INPUT_PLACEHOLDER`)
- CLI flags override environment variables
- All commands support `--timeout` for automatic abort
- Style flags use Lip Gloss conventions: colors can be hex (`"#FF0"`) or ANSI numbers (`212`)
- Pipe data via stdin or pass as positional args

## Commands

### choose — Select from a list

Pick one or more options from a list with keyboard navigation.

```bash
# Single selection (default)
gum choose "option1" "option2" "option3"

# Multi-select
gum choose --limit 3 "a" "b" "c" "d"
gum choose --no-limit "a" "b" "c"

# Pipe options via stdin
echo -e "alpha\nbeta\ngamma" | gum choose

# Pre-select items
gum choose --selected "b","c" "a" "b" "c" "d"

# With header
gum choose --header "Pick a color:" "red" "green" "blue"
```

| Flag                  | Type     | Default     | Description                    |
| --------------------- | -------- | ----------- | ------------------------------ |
| `--limit`             | int      | `1`         | Max selectable items           |
| `--no-limit`          | bool     | `false`     | Unlimited selections           |
| `--ordered`           | bool     | `false`     | Maintain selection order       |
| `--select-if-one`     | bool     | `false`     | Auto-select if only one option |
| `--height`            | int      | `10`        | Visible list height            |
| `--cursor`            | string   | `"> "`      | Cursor prefix for current item |
| `--cursor-prefix`     | string   | `"• "`      | Multi-select cursor indicator  |
| `--selected-prefix`   | string   | `"✓ "`      | Selected item marker           |
| `--unselected-prefix` | string   | `"• "`      | Unselected item marker         |
| `--header`            | string   | `"Choose:"` | Header text                    |
| `--selected`          | []string |             | Pre-selected options           |
| `--show-help`         | bool     | `true`      | Show keybind help              |
| `--input-delimiter`   | string   | `"\n"`      | Stdin item separator           |
| `--output-delimiter`  | string   | `"\n"`      | Stdout item separator          |
| `--label-delimiter`   | string   |             | Label:value delimiter          |
| `--strip-ansi`        | bool     | `true`      | Remove ANSI from input         |
| `--timeout`           | duration | `0s`        | Auto-abort timeout             |

Env prefix: `GUM_CHOOSE_`

---

### input — Single-line text prompt

```bash
# Basic prompt
NAME=$(gum input --placeholder "Enter your name")

# Password input
SECRET=$(gum input --password --placeholder "Enter password")

# Pre-filled value
EDIT=$(gum input --value "default text")

# Custom prompt and width
gum input --prompt "Email: " --width 50
```

| Flag            | Type     | Default               | Description                       |
| --------------- | -------- | --------------------- | --------------------------------- |
| `--placeholder` | string   | `"Type something..."` | Hint text                         |
| `--prompt`      | string   | `"> "`                | Prompt prefix                     |
| `--value`       | string   | `""`                  | Initial value                     |
| `--password`    | bool     | `false`               | Mask input characters             |
| `--char-limit`  | int      | `400`                 | Max length (0 = unlimited)        |
| `--width`       | int      | `0`                   | Input width (0 = terminal width)  |
| `--cursor-mode` | string   | `"blink"`             | Cursor: `blink`, `hide`, `static` |
| `--header`      | string   | `""`                  | Header text                       |
| `--show-help`   | bool     | `true`                | Show keybind help                 |
| `--timeout`     | duration | `0s`                  | Auto-abort timeout                |
| `--strip-ansi`  | bool     | `true`                | Strip ANSI from stdin             |

Style flags: `--cursor.foreground`, `--prompt.foreground`, `--placeholder.foreground`, `--header.foreground`

Env prefix: `GUM_INPUT_`

---

### write — Multi-line text input

Ctrl+D or Esc to submit.

```bash
# Basic multi-line
DESCRIPTION=$(gum write --placeholder "Details...")

# With dimensions
gum write --width 80 --height 10

# Show line numbers
gum write --show-line-numbers
```

| Flag                  | Type     | Default                | Description                       |
| --------------------- | -------- | ---------------------- | --------------------------------- |
| `--placeholder`       | string   | `"Write something..."` | Hint text                         |
| `--prompt`            | string   | `"┃ "`                 | Line prompt                       |
| `--value`             | string   | `""`                   | Initial value (or stdin)          |
| `--width`             | int      | `0`                    | Text area width (0 = terminal)    |
| `--height`            | int      | `5`                    | Text area height                  |
| `--char-limit`        | int      | `0`                    | Max length (0 = unlimited)        |
| `--max-lines`         | int      | `0`                    | Max lines (0 = unlimited)         |
| `--cursor-mode`       | string   | `"blink"`              | Cursor: `blink`, `hide`, `static` |
| `--show-cursor-line`  | bool     | `false`                | Highlight cursor line             |
| `--show-line-numbers` | bool     | `false`                | Show line numbers                 |
| `--show-help`         | bool     | `true`                 | Show keybind help                 |
| `--header`            | string   | `""`                   | Header text                       |
| `--timeout`           | duration | `0s`                   | Auto-abort timeout                |

Env prefix: `GUM_WRITE_`

---

### confirm — Yes/No prompt

Returns exit code 0 (yes) or 1 (no).

```bash
# Basic confirm
gum confirm "Delete this file?" && rm file.txt

# Custom labels
gum confirm --affirmative "Do it" --negative "Cancel" "Proceed?"

# Default to No
gum confirm --default=false "Are you sure?"

# Show the choice in output
gum confirm --show-output "Continue?"
```

| Flag            | Type     | Default | Description                    |
| --------------- | -------- | ------- | ------------------------------ |
| `--default`     | bool     | `true`  | Default action (true = yes)    |
| `--affirmative` | string   | `"Yes"` | Affirmative button label       |
| `--negative`    | string   | `"No"`  | Negative button label          |
| `--show-output` | bool     | `false` | Print prompt and chosen action |
| `--show-help`   | bool     | `true`  | Show keybind help              |
| `--timeout`     | duration | `0s`    | Auto-abort timeout             |

Prompt is a positional arg: `gum confirm "Your question?"`

Env prefix: `GUM_CONFIRM_`

---

### filter — Fuzzy search through items

```bash
# Filter files in current directory (default behavior)
gum filter

# Filter piped items
echo -e "apple\nbanana\ncherry" | gum filter

# Multi-select with filter
cat items.txt | gum filter --no-limit

# Exact/prefix matching instead of fuzzy
gum filter --no-fuzzy < items.txt

# Pre-fill search query
echo -e "one\ntwo\nthree" | gum filter --value "tw"

# Bottom-up display
gum filter --reverse < items.txt
```

| Flag                  | Type     | Default       | Description                     |
| --------------------- | -------- | ------------- | ------------------------------- |
| `--limit`             | int      | `1`           | Max selectable items            |
| `--no-limit`          | bool     | `false`       | Unlimited selections            |
| `--select-if-one`     | bool     | `false`       | Auto-select single match        |
| `--strict`            | bool     | `true`        | Only return matching items      |
| `--fuzzy`             | bool     | `true`        | Fuzzy matching (false = prefix) |
| `--fuzzy-sort`        | bool     | `true`        | Sort by match score             |
| `--value`             | string   | `""`          | Initial filter text             |
| `--reverse`           | bool     | `false`       | Bottom-up display               |
| `--height`            | int      | `0`           | Display height                  |
| `--width`             | int      | `0`           | Display width                   |
| `--indicator`         | string   | `"•"`         | Selection marker                |
| `--selected-prefix`   | string   | `" ◉ "`       | Selected item prefix            |
| `--unselected-prefix` | string   | `" ○ "`       | Unselected item prefix          |
| `--header`            | string   | `""`          | Header text                     |
| `--placeholder`       | string   | `"Filter..."` | Input placeholder               |
| `--prompt`            | string   | `"> "`        | Prompt text                     |
| `--selected`          | []string |               | Pre-selected options            |
| `--show-help`         | bool     | `true`        | Show keybind help               |
| `--input-delimiter`   | string   | `"\n"`        | Stdin separator                 |
| `--output-delimiter`  | string   | `"\n"`        | Stdout separator                |
| `--strip-ansi`        | bool     | `true`        | Strip ANSI from input           |
| `--timeout`           | duration | `0s`          | Auto-abort timeout              |

Env prefix: `GUM_FILTER_`

---

### file — Interactive file picker

```bash
# Browse from current directory
gum file

# Browse from specific path
gum file /home/user/projects

# Show hidden files
gum file --all

# Select directories only
gum file --directory --no-file

# Set display height
gum file --height 20
```

| Flag                   | Type     | Default | Description               |
| ---------------------- | -------- | ------- | ------------------------- |
| `--cursor` / `-c`      | string   | `">"`   | Cursor character          |
| `--all` / `-a`         | bool     | `false` | Show hidden/dot files     |
| `--permissions` / `-p` | bool     | `true`  | Show file permissions     |
| `--size` / `-s`        | bool     | `true`  | Show file sizes           |
| `--file`               | bool     | `true`  | Allow file selection      |
| `--directory`          | bool     | `false` | Allow directory selection |
| `--height`             | int      | `10`    | Max displayed files       |
| `--header`             | string   | `""`    | Header text               |
| `--show-help`          | bool     | `true`  | Show keybind help         |
| `--timeout`            | duration | `0s`    | Auto-abort timeout        |

Path is a positional arg: `gum file [path]`

Env prefix: `GUM_FILE_`

---

### spin — Spinner during command execution

Displays an animated spinner while a command runs. The command follows `--`.

```bash
# Basic spinner
gum spin --title "Installing..." -- npm install

# Different spinner style
gum spin --spinner globe --title "Deploying..." -- ./deploy.sh

# Show command output alongside spinner
gum spin --show-output --title "Building..." -- make build

# Show output only on failure
gum spin --show-error -- ./test.sh
```

| Flag               | Type     | Default        | Description                       |
| ------------------ | -------- | -------------- | --------------------------------- |
| `--spinner` / `-s` | enum     | `"dot"`        | Animation style (see below)       |
| `--title`          | string   | `"Loading..."` | Display text                      |
| `--show-output`    | bool     | `false`        | Show stdout + stderr              |
| `--show-error`     | bool     | `false`        | Show output only on failure       |
| `--show-stdout`    | bool     | `false`        | Show stdout only                  |
| `--show-stderr`    | bool     | `false`        | Show stderr only                  |
| `--align` / `-a`   | enum     | `"left"`       | Spinner position: `left`, `right` |
| `--timeout`        | duration | `0s`           | Auto-abort timeout                |

**Spinner types:** `line`, `dot`, `minidot`, `jump`, `pulse`, `points`, `globe`, `moon`, `monkey`, `meter`, `hamburger`

Command is passed after `--`: `gum spin --title "..." -- <command>`

Env prefix: `GUM_SPIN_`

---

### style — Apply formatting to text

```bash
# Colored text with border
gum style --foreground 212 --border double --border-foreground 212 \
  --padding "1 2" --margin "1" --align center "Hello, World!"

# Bold italic
gum style --bold --italic "Important"

# Combine styled blocks
I=$(gum style --border double --padding "1 2" "Block 1")
II=$(gum style --border double --padding "1 2" "Block 2")
gum join "$I" "$II"
```

| Flag                  | Type   | Default  | Description                                              |
| --------------------- | ------ | -------- | -------------------------------------------------------- |
| `--foreground`        | string |          | Text color (hex or ANSI number)                          |
| `--background`        | string |          | Background color                                         |
| `--border`            | enum   | `"none"` | `none`, `hidden`, `normal`, `rounded`, `thick`, `double` |
| `--border-foreground` | string |          | Border color                                             |
| `--border-background` | string |          | Border background                                        |
| `--align`             | enum   | `"left"` | `left`, `center`, `right`, `bottom`, `middle`, `top`     |
| `--width`             | int    |          | Output width                                             |
| `--height`            | int    |          | Output height                                            |
| `--margin`            | string |          | External spacing (Lip Gloss format)                      |
| `--padding`           | string |          | Internal spacing (Lip Gloss format)                      |
| `--bold`              | bool   | `false`  | Bold text                                                |
| `--italic`            | bool   | `false`  | Italic text                                              |
| `--faint`             | bool   | `false`  | Faint/dim text                                           |
| `--strikethrough`     | bool   | `false`  | Strikethrough text                                       |
| `--underline`         | bool   | `false`  | Underline text                                           |
| `--trim`              | bool   | `false`  | Trim whitespace per line                                 |
| `--strip-ansi`        | bool   | `true`   | Strip ANSI from stdin                                    |

Text is a positional arg. Can also pipe via stdin.

Env prefix: `GUM_STYLE_`

---

### join — Combine styled text blocks

```bash
# Horizontal join (default)
gum join "$BLOCK_A" "$BLOCK_B"

# Vertical stack
gum join --vertical "$HEADER" "$BODY" "$FOOTER"

# With alignment
gum join --vertical --align center "$TITLE" "$CONTENT"
```

| Flag           | Type | Default  | Description                                          |
| -------------- | ---- | -------- | ---------------------------------------------------- |
| `--horizontal` | bool | `false`  | Join strings horizontally                            |
| `--vertical`   | bool | `false`  | Join strings vertically                              |
| `--align`      | enum | `"left"` | `left`, `center`, `right`, `bottom`, `middle`, `top` |

Text blocks are positional args.

---

### format — Render formatted text

```bash
# Render markdown (default)
gum format -- "# Heading" "Paragraph text" "- item 1" "- item 2"

# Syntax-highlighted code
echo 'fn main() { println!("hello"); }' | gum format -t code -l rust

# Render emojis by name
gum format -t emoji "I :heart: gum"

# Template strings
gum format -t template '{{ Bold "hello" }}'
```

| Flag                | Type   | Default      | Description                             |
| ------------------- | ------ | ------------ | --------------------------------------- |
| `-t` / `--type`     | enum   | `"markdown"` | `markdown`, `code`, `template`, `emoji` |
| `-l` / `--language` | string | `""`         | Language for code highlighting          |
| `--theme`           | string | `"pink"`     | Glamour theme for markdown              |
| `--strip-ansi`      | bool   | `true`       | Strip ANSI from stdin                   |

Template string values are positional args. Can also pipe via stdin.

Env prefix: `GUM_FORMAT_`

---

### table — Select a row from tabular data

```bash
# From CSV file
gum table < data.csv

# From file path
gum table -f data.csv

# Custom separator and column names
gum table -s "\t" -c "Name,Age,City" < data.tsv

# Set column widths
gum table -w 20,10,15 < data.csv

# Return specific column value
gum table -r 2 < data.csv   # returns column 2 value only

# Static print (no selection)
gum table -p < data.csv

# Custom border
gum table --border thick < data.csv
```

| Flag                     | Type     | Default     | Description                                              |
| ------------------------ | -------- | ----------- | -------------------------------------------------------- |
| `-s` / `--separator`     | string   | `","`       | Column separator                                         |
| `-c` / `--columns`       | []string |             | Column header names                                      |
| `-w` / `--widths`        | []int    |             | Column widths                                            |
| `-f` / `--file`          | string   | `""`        | File path to read                                        |
| `-p` / `--print`         | bool     | `false`     | Static print (no selection)                              |
| `-b` / `--border`        | enum     | `"rounded"` | `rounded`, `thick`, `normal`, `hidden`, `double`, `none` |
| `-r` / `--return-column` | int      | `0`         | Column to return (0 = whole row)                         |
| `--height`               | int      | `0`         | Table height                                             |
| `--show-help`            | bool     | `true`      | Show keybind help                                        |
| `--hide-count`           | bool     | `false`     | Hide item count in help                                  |
| `--lazy-quotes`          | bool     | `false`     | Allow unescaped quotes in fields                         |
| `--fields-per-record`    | int      | `0`         | Expected fields per row                                  |
| `--timeout`              | duration | `0s`        | Auto-abort timeout                                       |

Env prefix: `GUM_TABLE_`

---

### pager — Scroll through content

```bash
# Pipe content
cat README.md | gum pager

# Positional arg
gum pager "Long text content here..."

# Without line numbers
gum pager --show-line-numbers=false < log.txt

# Disable soft wrap
gum pager --soft-wrap=false < code.py
```

| Flag                  | Type     | Default | Description          |
| --------------------- | -------- | ------- | -------------------- |
| `--show-line-numbers` | bool     | `true`  | Show line numbers    |
| `--soft-wrap`         | bool     | `true`  | Soft wrap long lines |
| `--timeout`           | duration | `0s`    | Auto-exit timeout    |

Content is a positional arg. Can also pipe via stdin.

Env prefix: `GUM_PAGER_`

---

### log — Structured log output

```bash
# Basic log
gum log "Application started"

# With level
gum log --level info "Server listening on :8080"
gum log --level error "Connection failed"
gum log --level debug "Query took 42ms"

# Structured key-value pairs
gum log --structured --level info "Request" method GET path /api status 200

# JSON output
gum log --structured --formatter json --level info "Event" key value

# With timestamp
gum log --time rfc822 --level warn "Disk usage high"

# With prefix
gum log --prefix "myapp" --level info "Starting"

# Minimum level filter
GUM_LOG_LEVEL=warn gum log --level debug "This won't show"
```

| Flag                  | Type   | Default  | Description                                       |
| --------------------- | ------ | -------- | ------------------------------------------------- |
| `--level`             | enum   | `"none"` | `none`, `debug`, `info`, `warn`, `error`, `fatal` |
| `--structured` / `-s` | bool   | `false`  | Structured logging mode                           |
| `--formatter`         | enum   | `"text"` | `text`, `json`, `logfmt`                          |
| `--time`              | string | `""`     | Timestamp format (e.g., `rfc822`, `kitchen`)      |
| `--prefix`            | string | `""`     | Message prefix                                    |
| `-o` / `--file`       | string | `""`     | Output file path                                  |
| `-f` / `--format`     | bool   | `false`  | Enable printf-style formatting                    |

Minimum display level: `GUM_LOG_LEVEL` env var

Env prefix: `GUM_LOG_`

---

## Environment Variables

All flags can be set as environment variables with the pattern:

```
GUM_<COMMAND>_<FLAG>=value
```

Flag names are uppercased with hyphens replaced by underscores.

```bash
# Examples
export GUM_INPUT_PLACEHOLDER="Enter your name"
export GUM_INPUT_WIDTH=80
export GUM_INPUT_CURSOR_FOREGROUND="#FF0"
export GUM_CHOOSE_HEADER="Select one:"
export GUM_SPIN_SPINNER=globe
export GUM_CONFIRM_TIMEOUT=30s
```

Style sub-flags follow the pattern `GUM_<COMMAND>_<COMPONENT>_<PROPERTY>`:

```bash
export GUM_INPUT_PROMPT_FOREGROUND="#0FF"
export GUM_CHOOSE_CURSOR_FOREGROUND=212
export GUM_TABLE_SELECTED_FOREGROUND=212
```

## Styling System

All commands with visual elements support embedded Lip Gloss style flags via dot-notation prefixes. Each styleable component exposes:

| Property                       | Description      |
| ------------------------------ | ---------------- |
| `--<prefix>.foreground`        | Text color       |
| `--<prefix>.background`        | Background color |
| `--<prefix>.bold`              | Bold text        |
| `--<prefix>.italic`            | Italic text      |
| `--<prefix>.faint`             | Dim text         |
| `--<prefix>.underline`         | Underline        |
| `--<prefix>.strikethrough`     | Strikethrough    |
| `--<prefix>.margin`            | External spacing |
| `--<prefix>.padding`           | Internal spacing |
| `--<prefix>.border`            | Border style     |
| `--<prefix>.border-foreground` | Border color     |
| `--<prefix>.align`             | Alignment        |
| `--<prefix>.width`             | Width            |
| `--<prefix>.height`            | Height           |

Colors accept: ANSI numbers (`212`), hex strings (`"#FF0"`), or named colors.

Spacing values use Lip Gloss format: `"1"` (all sides), `"1 2"` (vertical horizontal), `"1 2 3 4"` (top right bottom left).

## Common Patterns

### Conventional commit helper

```bash
#!/bin/bash
TYPE=$(gum choose "fix" "feat" "docs" "style" "refactor" "test" "chore" "revert")
SCOPE=$(gum input --placeholder "scope")
test -n "$SCOPE" && SCOPE="($SCOPE)"

SUMMARY=$(gum input --value "$TYPE$SCOPE: " --placeholder "Summary of this change")
DESCRIPTION=$(gum write --placeholder "Details of this change (CTRL+D to finish)")

gum confirm "Commit changes?" && git commit -m "$SUMMARY" -m "$DESCRIPTION"
```

### Interactive git branch checkout

```bash
BRANCH=$(git branch --format='%(refname:short)' | gum filter --placeholder "Switch to branch...")
git checkout "$BRANCH"
```

### tmux session picker

```bash
SESSION=$(tmux list-sessions -F '#S' | gum filter --placeholder "Pick session...")
tmux switch-client -t "$SESSION"
```

### Styled dashboard layout

```bash
HEADER=$(gum style --foreground 212 --border double --align center --width 50 "Dashboard")
LEFT=$(gum style --border rounded --width 24 --padding "1 2" "Status: OK")
RIGHT=$(gum style --border rounded --width 24 --padding "1 2" "Uptime: 42d")
CONTENT=$(gum join "$LEFT" "$RIGHT")
gum join --vertical "$HEADER" "$CONTENT"
```

### Confirm before destructive action

```bash
gum confirm "Delete all logs?" --affirmative "Yes, delete" --negative "Cancel" --default=false \
  && rm -rf ./logs \
  || echo "Aborted"
```

### Spinner with output capture

```bash
# Run command, show spinner, then use output
OUTPUT=$(gum spin --show-output --title "Fetching data..." -- curl -s https://api.example.com/data)
echo "$OUTPUT" | gum format -t code -l json
```

### Multi-select with processing

```bash
PACKAGES=$(gum choose --no-limit "eslint" "prettier" "typescript" "jest" "vitest")
echo "$PACKAGES" | while read -r pkg; do
  gum spin --title "Installing $pkg..." -- npm install -D "$pkg"
done
```

## Troubleshooting

- **No output captured**: Ensure you use `$()` command substitution — gum writes to stdout
- **Spinner hides command output**: Add `--show-output` to `gum spin`
- **Confirm always returns 0**: Check you're using `&&`/`||` or `$?` — the exit code is the result, not stdout
- **Timeout not working**: Ensure duration format is correct (e.g., `30s`, `5m`, `1h`)
- **Styles not rendering**: Verify terminal supports ANSI colors. Set `NO_COLOR=1` to disable
- **Stdin conflicts**: When piping into gum AND reading input, use `< /dev/tty` for interactive commands or pass items as positional args instead
