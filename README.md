# youtube-watchlater-mcp

MCP server for fetching your YouTube Watch Later playlist via [yt-dlp](https://github.com/yt-dlp/yt-dlp).

## Why This Exists

**The YouTube Watch Later playlist is invisible to the YouTube Data API.**

Most YouTube MCP servers and integrations use the official [YouTube Data API v3](https://developers.google.com/youtube/v3) with OAuth authentication. This works well for public playlists, subscriptions, search, and liked videos — but Watch Later is a special private playlist (`WL`) that Google has explicitly excluded from the API. Even with full OAuth scopes and a valid token, the API returns an empty result or a `403 Forbidden` error for this playlist.

This means:
- **OAuth-based MCPs cannot access Watch Later** — the endpoint simply does not exist in the API.
- **Scraping the YouTube web UI** requires managing session cookies, handling anti-bot measures, and is fragile against layout changes.
- **yt-dlp with browser cookies** is the only reliable approach: it reads the authentication cookies that your browser already holds from your active YouTube login, and uses them to fetch the playlist directly — exactly as your browser would.

This server wraps that mechanism as an MCP tool so AI assistants can read your Watch Later queue without you needing API keys, OAuth flows, or exposing credentials.

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
