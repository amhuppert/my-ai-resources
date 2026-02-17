# PDF Compilation on macOS

## Installing MacTeX

### Full MacTeX (~4.5 GB) — Recommended

Includes the complete TeX Live distribution plus GUI applications (TeXShop, BibDesk, TeX Live Utility):

```bash
brew install --cask mactex
```

After installation, restart the terminal. The installer adds `/Library/TeX/texbin/` to PATH automatically.

### BasicTeX (~100 MB) — Minimal

Core TeX Live only. Additional packages must be installed manually via `tlmgr`:

```bash
brew install --cask basictex
```

After installation, restart the terminal, then install commonly needed extras:

```bash
sudo tlmgr update --self
sudo tlmgr install latexmk collection-fontsrecommended collection-latexextra
```

### Full MacTeX vs BasicTeX

| Aspect | Full MacTeX | BasicTeX |
|---|---|---|
| Size | ~4.5 GB | ~100 MB |
| Packages | Everything | Core only |
| GUI apps | TeXShop, BibDesk, etc. | None |
| Package management | Rarely needed | Frequent via `tlmgr` |
| Best for | General use | CI/CD, minimal setups |

Prefer Full MacTeX unless disk space is constrained. It eliminates "missing package" errors entirely.

## Managing Packages with tlmgr

```bash
# Update tlmgr itself
sudo tlmgr update --self

# Update all packages
sudo tlmgr update --all

# Install a specific package
sudo tlmgr install <package-name>

# Search for a package
tlmgr search --global <search-term>

# Find which package provides a file
tlmgr search --global --file <name>.sty

# List installed packages
tlmgr list --only-installed

# Package info
tlmgr info <package-name>
```

`sudo` is required because MacTeX installs system-wide to `/usr/local/texlive/`.

## Troubleshooting

### "command not found" After Install

Restart the terminal. If still missing:

```bash
# Check the TeX binaries location
ls /Library/TeX/texbin/

# Add to PATH if needed (add to ~/.zshrc for persistence)
export PATH="/Library/TeX/texbin:$PATH"
```

### Permission Errors with tlmgr

Use `sudo` for all `tlmgr` commands. Alternatively, use the TeX Live Utility GUI app (included with Full MacTeX) which handles permissions automatically.

### BasicTeX Missing Packages

Expected with BasicTeX. Install as needed:

```bash
# Find and install a missing package
tlmgr search --global --file <name>.sty
sudo tlmgr install <package-name>
```

Common packages to add for BasicTeX:

```bash
sudo tlmgr install latexmk collection-fontsrecommended collection-latexextra \
  booktabs enumitem microtype csquotes biblatex biber siunitx caption subcaption \
  cleveref xcolor hyperref koma-script
```

### macOS Gatekeeper Blocking Installer

Go to System Settings > Privacy & Security and allow the blocked installer.

### Annual TeX Live Updates

MacTeX releases annually (spring). `tlmgr update` does not cross major versions. To upgrade to a new TeX Live year, reinstall MacTeX from Homebrew or the MacTeX website.

### Font Issues

macOS system fonts are available to XeTeX and LuaTeX via `fontspec`. To add custom fonts, install them through Font Book or place `.ttf`/`.otf` files in `~/Library/Fonts/`.
