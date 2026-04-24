const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const YTDLP = path.join(process.cwd(), "yt-dlp");
const TMP_DIR = path.join(process.cwd(), "tmp_autolink");
const MAX_MB = 80;
const MAX_DURATION = 1200;

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const SUPPORTED_DOMAINS = [
  "youtube.com", "youtu.be", "m.youtube.com",
  "tiktok.com", "vm.tiktok.com", "vt.tiktok.com",
  "facebook.com", "fb.com", "fb.watch", "m.facebook.com",
  "instagram.com", "instagr.am",
  "twitter.com", "x.com", "t.co",
  "reddit.com", "v.redd.it",
  "twitch.tv", "clips.twitch.tv",
  "dailymotion.com", "dai.ly",
  "vimeo.com", "streamable.com",
  "bilibili.com", "snapchat.com",
  "pinterest.com", "pin.it",
  "linkedin.com", "soundcloud.com"
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
      "--no-warnings",
      "--dump-single-json",
      "--socket-timeout", "20",
      "--retries", "2",
      url
    ], { timeout: 45000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) return reject(err || new Error("no info"));
      try { resolve(JSON.parse(stdout.trim())); }
      catch { reject(new Error("bad json")); }
    });
  });
}

function ytdlpDownload(url, outBase) {
  return new Promise((resolve, reject) => {
    const args = [
      "--no-playlist",
      "--no-warnings",
      "--socket-timeout", "20",
      "--retries", "3",
      "--fragment-retries", "3",
      "--no-part",
      "--restrict-filenames",
      "-f", "best[ext=mp4][height<=720]/best[ext=mp4]/bv*[height<=720]+ba/best",
      "--merge-output-format", "mp4",
      "-o", outBase + ".%(ext)s",
      url
    ];
    execFile(YTDLP, args, { timeout: 180000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr?.slice(-200) || err.message));
      }
      const dir = path.dirname(outBase);
      const base = path.basename(outBase);
      try {
        const found = fs.readdirSync(dir).find(f => f.startsWith(base + "."));
        if (found) return resolve(path.join(dir, found));
      } catch (_) {}
      reject(new Error("file not found after download"));
    });
  });
}

const _processing = new Set();

module.exports = {
  config: {
    name: "رابط-تلقائي",
    aliases: ["autolink"],
    version: "2.2",
    author: "Saint",
    countDown: 0,
    role: 0,
    shortDescription: "تنزيل تلقائي لأي رابط فيديو",
    category: "media",
  },

  onStart: async function () {},

  onChat: async function ({ api, event }) {
    if (!event) return;
    if (event.senderID === api.getCurrentUserID()) return;

    const { threadID, messageID, senderID } = event;
    const body = event.body || "";

    const collected = new Set();

    const bodyMatches = body.match(/(https?:\/\/[^\s<>]+)/g);
    if (bodyMatches) bodyMatches.forEach(u => collected.add(u));

    if (Array.isArray(event.attachments)) {
      for (const att of event.attachments) {
        const candidates = [
          att?.url,
          att?.facebookUrl,
          att?.source,
          att?.target?.url,
          att?.title,
          att?.description
        ].filter(v => typeof v === "string");
        for (const c of candidates) {
          const m = c.match(/(https?:\/\/[^\s<>"']+)/g);
          if (m) m.forEach(u => collected.add(u));
        }
      }
    }

    if (collected.size === 0) return;

    const cleanedLinks = [...collected].map(u => {
      try {
        const parsed = new URL(u);
        if (parsed.hostname.includes("l.facebook.com") || parsed.hostname.includes("lm.facebook.com")) {
          const real = parsed.searchParams.get("u");
          if (real) return decodeURIComponent(real);
        }
        return u;
      } catch { return u; }
    });

    const links = [...new Set(cleanedLinks)].filter(isSupportedLink);
    if (links.length === 0) return;

    const key = `${threadID}:${messageID}`;
    if (_processing.has(key)) return;
    _processing.add(key);

    try { api.setMessageReaction("⏳", messageID, () => {}, true); } catch (_) {}

    let anySuccess = false;

    for (const url of links.slice(0, 2)) {
      const outBase = path.join(TMP_DIR, `${Date.now()}_${senderID}_${Math.random().toString(36).slice(2, 7)}`);
      let filePath = null;
      try {
        let info = null;
        try { info = await ytdlpGetInfo(url); } catch (_) {}

        const title = (info?.title || "فيديو").toString().slice(0, 80);
        const duration = Number(info?.duration || 0);

        if (duration && duration > MAX_DURATION) {
          continue;
        }

        filePath = await ytdlpDownload(url, outBase);
        const stats = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > MAX_MB) {
          try { fs.unlinkSync(filePath); } catch (_) {}
          continue;
        }

        const durStr = duration
          ? ` • ⏱ ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`
          : "";

        await new Promise((res) => {
          api.sendMessage(
            {
              body: `📥 ${title}\n📦 ${sizeMB.toFixed(1)} MB${durStr}`,
              attachment: fs.createReadStream(filePath)
            },
            threadID,
            () => {
              try { fs.unlinkSync(filePath); } catch (_) {}
              res();
            },
            messageID
          );
        });

        anySuccess = true;

      } catch (e) {
        console.log(`[autolink] failed for ${url}:`, e.message);
        try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
        try {
          const dir = path.dirname(outBase);
          const base = path.basename(outBase);
          for (const f of fs.readdirSync(dir)) {
            if (f.startsWith(base)) try { fs.unlinkSync(path.join(dir, f)); } catch (_) {}
          }
        } catch (_) {}
      }
    }

    try { api.setMessageReaction(anySuccess ? "✅" : "❌", messageID, () => {}, true); } catch (_) {}
    _processing.delete(key);
  }
};
