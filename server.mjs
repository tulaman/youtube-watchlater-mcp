#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile("yt-dlp", args, { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const msg = (stderr || stdout || err.message || "").toString().slice(0, 1000);
        reject(new Error(`yt-dlp failed: ${msg}`));
      } else {
        resolve(stdout.toString());
      }
    });
  });
}

const server = new McpServer({ name: "youtube-watchlater", version: "0.1.0" });

const InputSchema = z.object({
  browser: z.enum(["chrome", "brave", "edge", "firefox"])
    .default("chrome")
    .describe("Which browser to read YouTube cookies from (cookies-from-browser)."),
  limit: z.number().int().min(1).max(500)
    .default(50)
    .describe("How many items to return from Watch Later."),
  profile: z.string()
    .optional()
    .describe('Browser profile name, e.g. "Default" or "Profile 1" (Chrome/Brave/Edge).'),
});

server.tool(
  "get_watch_later",
  "Returns videos from your YouTube Watch Later list using yt-dlp + cookies-from-browser. Args example: {"browser":"chrome","limit":50,"profile":"Profile 1"}`",
  InputSchema,
  async ({ browser, limit, profile }) => {
    const wlUrl = "https://www.youtube.com/playlist?list=WL";

    const cookieArg = profile
      ? `${browser}:${profile}`
      : browser;

    const args = [
      "--cookies-from-browser", cookieArg,
      "--flat-playlist",
      "--dump-json",
      "--playlist-end", String(limit ?? 50),
      wlUrl,
    ];

    const stdout = await runYtDlp(args);

    const items = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const x = JSON.parse(line);
        const id = x.id;
        return {
          videoId: id,
          title: x.title ?? "(no title)",
          url: x.url ?? (id ? `https://www.youtube.com/watch?v=${id}` : null),
          channel: x.channel ?? x.uploader ?? null,
        };
      });

    return {
      content: [{ type: "text", text: JSON.stringify({ items }, null, 2) }],
    };
  }
);

await server.connect(new StdioServerTransport());
