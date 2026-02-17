# PDF Compilation on Ubuntu/Debian

## Installing TeX Live

### Recommended Install (~1 GB)

Covers most documents including scientific/math content:

```bash
sudo apt install texlive-latex-extra texlive-fonts-recommended texlive-fonts-extra texlive-science latexmk
```

### Minimal Install (~300 MB)

Core LaTeX only — likely to require additional packages later:

```bash
sudo apt install texlive latexmk
```

### Full Install (~5 GB)

Everything, no missing packages ever:

```bash
sudo apt install texlive-full
```

### Individual Package Groups

| Package | Contents |
|---|---|
| `texlive-latex-base` | Core LaTeX |
| `texlive-latex-extra` | geometry, hyperref, booktabs, enumitem, etc. |
| `texlive-latex-recommended` | Commonly used packages |
| `texlive-fonts-recommended` | Standard fonts (Latin Modern, etc.) |
| `texlive-fonts-extra` | Extended font collection |
| `texlive-science` | siunitx, algorithms, math packages |
| `texlive-bibtex-extra` | Additional bibliography styles |
| `texlive-publishers` | Publisher templates (IEEE, ACM, etc.) |
| `texlive-xetex` | XeTeX engine |
| `texlive-luatex` | LuaTeX engine |
| `texlive-lang-*` | Language-specific support |

### Finding a Missing Package

When compilation fails with "File `<name>.sty` not found":

```bash
# Find which apt package provides a .sty file
apt-file search <name>.sty

# If apt-file is not installed:
sudo apt install apt-file && sudo apt-file update
apt-file search <name>.sty
```

## Troubleshooting

### "File not found" for .sty

Missing LaTeX package. Find and install:

```bash
apt-file search microtype.sty
# Output: texlive-latex-recommended: /usr/share/texlive/texmf-dist/tex/latex/microtype/microtype.sty
sudo apt install texlive-latex-recommended
```

### Font Issues with XeTeX/LuaTeX

Install system fonts or place font files in `~/.local/share/fonts/`:

```bash
# Install common font packages
sudo apt install fonts-liberation fonts-dejavu fonts-noto

# Refresh font cache after adding fonts
fc-cache -fv
```

### "I can't write on file document.pdf"

The PDF is open in a viewer that locks the file. Close the viewer or use one that does not lock files (Evince handles this well).

### Overfull/Underfull Box Warnings

The `microtype` package resolves most of these. For persistent overfull boxes, try:

```latex
% In preamble — gives LaTeX more flexibility for line breaking
\emergencystretch=3em
```

### Outdated Packages

The apt-packaged TeX Live often lags upstream by 1-2 years. If a package requires a newer version than apt provides, install TeX Live directly from [TUG](https://tug.org/texlive/) instead of apt. This replaces the apt-managed installation.
