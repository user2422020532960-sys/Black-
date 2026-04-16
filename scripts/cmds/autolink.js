const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const axios = require("axios");

const YTDLP = path.join(process.cwd(), "yt-dlp");
const TMP_DIR = path.join(process.cwd(), "tmp_autolink");
const MAX_MB = 24;

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const SUPPORTED_DOMAINS = [
  "youtube.com", "youtu.be",
  "tiktok.com", "vm.tiktok.com", "vt.tiktok.com",
  "facebook.com", "fb.com", "fb.watch",
  "instagram.com", "instagr.am",
  "twitter.com", "x.com", "t.co",
  "reddit.com", "v.redd.it",
  "twitch.tv", "clips.twitch.tv",
  "dailymotion.com", "dai.ly",
  "vimeo.com", "streamable.com",
  "bilibili.com"
];

function isSupportedLink(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SUPPORTED_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}

function ytdlpGetInfo(url) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP, [
      "--no-playlist",
      "--dump-json",
      "--no-warnings",
      "--quiet",
      url
    ], { timeout: 30000 }, (err, stdout) => {
      if (err || !stdout) return reject(err || new Error("No output"));
      try { resolve(JSON.parse(stdout.trim())); }
      catch { reject(new Error("JSON parse failed")); }
    });
  });
}

function ytdlpDownload(url, outPath) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP, [
      "--no-playlist",
      "--no-warnings",
      "--quiet",
      "-f", `bestvideo[ext=mp4][filesize<${MAX_MB}M]+bestaudio[ext=m4a]/best[ext=mp4][filesize<${MAX_MB}M]/best[filesize<${MAX_MB}M]/best`,
      "--merge-output-format", "mp4",
      "-o", outPath,
      url
    ], { timeout: 90000 }, (err) => {
      if (err) return reject(err);
      if (fs.existsSync(outPath)) return resolve(outPath);
      const withExt = outPath + ".mp4";
      if (fs.existsSync(withExt)) return resolve(withExt);
      reject(new Error("File not found after download"));
    });
  });
}

const _processing = new Set();

module.exports = {
  config: {
    name: "رابط-تلقائي",
    aliases: ["autolink"],
    version: "2.0",
    author: "Saint",
    countDown: 0,
    role: 0,
    shortDescription: "تنزيل تلقائي لأي رابط فيديو في الجروب",
    category: "media",
  },

  onStart: async function () {},

  onChat: async function ({ api, event }) {
    const { threadID, messageID, senderID } = event;
    const body = event.body || "";

    const linkMatches = body.match(/(https?:\/\/[^\s]+)/g);
    if (!linkMatches) return;

    const links = [...new Set(linkMatches)].filter(isSupportedLink);
    if (links.length === 0) return;

    const key = `${threadID}:${messageID}`;
    if (_processing.has(key)) return;
    _processing.add(key);

    api.setMessageReaction("⏳", messageID, () => {}, true);

    let anySuccess = false;

    for (const url of links.slice(0, 2)) {
      const outPath = path.join(TMP_DIR, `${Date.now()}_${senderID}`);
      try {
        let info;
        try { info = await ytdlpGetInfo(url); } catch (_) { info = null; }

        const title = info?.title || "فيديو";
        const duration = info?.duration || 0;

        if (duration > 600) {
          continue;
        }

        const filePath = await ytdlpDownload(url, outPath);
        const stats = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > MAX_MB) {
          fs.unlinkSync(filePath);
          continue;
        }

        await api.sendMessage(
          {
            body:
              `📥 ${title}\n` +
              `📦 ${sizeMB.toFixed(1)} MB` +
              (duration ? ` • ⏱ ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}` : ""),
            attachment: fs.createReadStream(filePath)
          },
          threadID,
          () => { try { fs.unlinkSync(filePath); } catch (_) {} }
        );

        anySuccess = true;

      } catch (e) {
        try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
        try { if (fs.existsSync(outPath + ".mp4")) fs.unlinkSync(outPath + ".mp4"); } catch (_) {}
      }
    }

    api.setMessageReaction(anySuccess ? "✅" : "❌", messageID, () => {}, true);
    _processing.delete(key);
  }
};
