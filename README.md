# youtube-watchlater-mcp

MCP server for fetching your YouTube Watch Later playlist via [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Requirements

- Node.js 18+
- `yt-dlp` installed and available on `$PATH`
- YouTube account logged in to a browser on your machine

## Installation

**1. Install yt-dlp:**

```bash
# macOS
brew install yt-dlp

# Linux
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Windows (winget)
winget install yt-dlp
```

**2. Install Node.js dependencies:**

```bash
npm install
```

## Running

```bash
npm start
```

The server communicates over stdio and is intended to be connected to an MCP host (e.g. Claude Desktop), not run directly in a browser.

## Claude Desktop Setup

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "youtube-watchlater": {
      "command": "node",
      "args": ["/path/to/youtube-watchlater-mcp/server.mjs"]
    }
  }
}
```

## Tool: `get_watch_later`

Returns videos from your Watch Later playlist.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `browser` | `chrome` \| `brave` \| `edge` \| `firefox` | `chrome` | Browser to read YouTube cookies from |
| `limit` | number (1–500) | `50` | Number of videos to return |
| `profile` | string | — | Browser profile name, e.g. `"Default"` or `"Profile 1"` |

Example response:

```json
{
  "items": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Never Gonna Give You Up",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "channel": "Rick Astley"
    }
  ]
}
```

## How It Works

The server calls `yt-dlp --cookies-from-browser <browser> --flat-playlist --dump-json` against the `WL` playlist. Cookies are read directly from the local browser — no tokens or passwords are transmitted anywhere.
