# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An MCP (Model Context Protocol) server that exposes a single tool `get_watch_later` to retrieve a user's YouTube Watch Later playlist via `yt-dlp` reading cookies from a local browser.

## Runtime & Dependencies

- Node.js with ES modules (`"type": "commonjs"` in package.json but `server.mjs` uses ESM syntax — run with Node directly)
- External system dependency: `yt-dlp` must be installed and on `$PATH`
- `@modelcontextprotocol/sdk` for MCP server/transport
- `zod` for input schema validation

## Running the Server

```bash
node server.mjs
```

The server communicates over stdio (MCP StdioServerTransport). It is intended to be registered as an MCP server in a host like Claude Desktop, not run standalone in a browser.

## MCP Tool: `get_watch_later`

- **Input**: `browser` (chrome/brave/edge/firefox), `limit` (1–500, default 50), `profile` (optional browser profile name)
- **Mechanism**: Shells out to `yt-dlp --cookies-from-browser <browser>[:<profile>] --flat-playlist --dump-json --playlist-end <limit> https://www.youtube.com/playlist?list=WL`
- **Output**: JSON array of `{ videoId, title, url, channel }` objects

## Architecture

The entire server is `server.mjs` — a single file with no routing layer, database, or config files. The only abstraction is `runYtDlp(args)` which wraps `execFile` in a Promise.
