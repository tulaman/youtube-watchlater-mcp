#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile("yt-dlp", args, { maxBuffer: 50 * 1024 * 1024, timeout: 60_000 }, (err, stdout, stderr) => {
      if (err) {
        const timedOut = err.killed ? " (process timed out)" : "";
        const msg = (stderr || stdout || err.message || "").toString().slice(0, 1000);
        reject(new Error(`yt-dlp failed${timedOut}: ${msg}`));
      } else {
        resolve(stdout.toString());
      }
    });
  });
}

const server = new McpServer({ name: "youtube-watchlater", version: "0.1.0" });

server.tool(
  "get_watch_later",
  "Returns videos from your YouTube Watch Later list using yt-dlp with cookies read from a local browser.",
  {
    browser: z.enum(["chrome", "brave", "edge", "firefox"])
      .default("chrome")
      .describe("Which browser to read YouTube cookies from."),
    limit: z.number().int().min(1).max(500)
      .default(50)
      .describe("How many items to return from Watch Later."),
    profile: z.string()
      .regex(/^[^:]+$/, "Profile name must not contain a colon")
      .optional()
      .describe('Browser profile name, e.g. "Default" or "Profile 1" (Chrome/Brave/Edge).'),
  },
  async ({ browser, limit, profile }) => {
    const wlUrl = "https://www.youtube.com/playlist?list=WL";

    const cookieArg = profile ? `${browser}:${profile}` : browser;

    const args = [
      "--cookies-from-browser", cookieArg,
      "--flat-playlist",
      "--dump-json",
      "--playlist-end", String(limit),
      wlUrl,
    ];

    const stdout = await runYtDlp(args);

    const items = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        let x;
        try {
          x = JSON.parse(line);
        } catch {
          return null;
        }
        const id = x.id;
        return {
          videoId: id,
          title: x.title ?? "(no title)",
          url: x.url ?? (id ? `https://www.youtube.com/watch?v=${id}` : null),
          channel: x.channel ?? x.uploader ?? null,
        };
      })
      .filter(Boolean);

    return {
      content: [{ type: "text", text: JSON.stringify({ items }, null, 2) }],
    };
  }
);

server.tool(
  "get_subtitles",
  "Downloads auto-generated subtitles for a YouTube video via yt-dlp and returns the VTT content.",
  {
    video: z.string()
      .describe("YouTube video URL or bare video ID (e.g. dQw4w9WgXcQ)."),
    lang: z.string()
      .default("en")
      .describe("Subtitle language code, e.g. \"en\" or \"ru\"."),
    browser: z.enum(["chrome", "brave", "edge", "firefox"])
      .default("chrome")
      .describe("Which browser to read YouTube cookies from."),
    profile: z.string()
      .regex(/^[^:]+$/, "Profile name must not contain a colon")
      .optional()
      .describe('Browser profile name, e.g. "Default" or "Profile 1".'),
  },
  async ({ video, lang, browser, profile }) => {
    const url = video.startsWith("http")
      ? video
      : `https://www.youtube.com/watch?v=${video}`;

    const videoId = (() => {
      try {
        return new URL(url).searchParams.get("v") ?? video;
      } catch {
        return video;
      }
    })();

    const cookieArg = profile ? `${browser}:${profile}` : browser;
    const tmpDir = await mkdtemp(join(tmpdir(), "yt-sub-"));

    try {
      const args = [
        "--cookies-from-browser", cookieArg,
        "--skip-download",
        "--write-auto-subs",
        "--sub-langs", lang,
        "--sub-format", "vtt",
        "--output", join(tmpDir, "%(id)s"),
        url,
      ];

      await runYtDlp(args);

      const files = await readdir(tmpDir);
      const vttFile = files.find((f) => f.endsWith(".vtt"));

      if (!vttFile) {
        throw new Error(`No subtitle file found for video "${videoId}" in language "${lang}". Auto-generated subtitles may not be available.`);
      }

      const subtitles = await readFile(join(tmpDir, vttFile), "utf8");

      return {
        content: [{ type: "text", text: JSON.stringify({ lang, videoId, subtitles }, null, 2) }],
      };
    } finally {
      await rm(tmpDir, { recursive: true }).catch(() => {});
    }
  }
);

await server.connect(new StdioServerTransport());
