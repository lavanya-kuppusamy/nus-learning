# snip CLI

Zero-dependency Node.js CLI for the [Snip](https://github.com/lavanya-kuppusamy/nus-learning) URL shortener.  
Requires **Node.js ≥ 18** (uses the built-in global `fetch`).

---

## Installation

```bash
# From the repo root (this branch)
npm link          # installs `snip` globally via the bin entry in package.json

# Or run directly without installing
node cli.js help
```

---

## Usage

```
snip add <url>    Shorten a URL and print the short link
snip ls           List all links (code / hits / original URL)
snip open <code>  Open a short link in the default browser
snip help         Show help text
```

### Examples

```bash
snip add https://example.com/very/long/path
# → http://localhost:3000/abc123

snip ls
# CODE    HITS  URL
# ------  ----  ----------------------------------------
# abc123     3  https://example.com/very/long/path

snip open abc123
# Opening: https://example.com/very/long/path
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `SNIP_API` | `http://localhost:3000` | Base URL of the Snip backend |

```bash
SNIP_API=https://my-snip.example.com snip ls
```

---

## Wrappers

| File | Platform | Usage |
|---|---|---|
| `snip` | bash / zsh (Linux, macOS) | `./snip add <url>` |
| `snip.cmd` | Windows Command Prompt | `snip add <url>` |
| `snip.ps1` | Windows PowerShell | `.\snip.ps1 add <url>` |

All wrappers simply forward arguments to `cli.js`.

---

## Error handling

- Bad input (missing URL / code) → stderr message + exit 1  
- Unknown short code → stderr message + exit 1  
- Backend unreachable → stderr message + exit 1  
- Server error (non-2xx) → stderr with HTTP status + exit 1  
