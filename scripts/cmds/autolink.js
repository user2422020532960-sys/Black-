const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
let sagorDownloadVideo = null;
try { sagorDownloadVideo = require("sagor-video-downloader").downloadVideo; } catch (_) {}

const YTDLP = path.join(process.cwd(), "yt-dlp");
const TMP_DIR = path.join(process.cwd(), "tmp_autolink");
const MAX_MB = 80;

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const SUPPORTED_DOMAINS = [
  "youtube.com", "youtu.be", "m.youtube.com",
  "tiktok.com", "vm.tiktok.com", "vt.tiktok.com",
  "facebook.com", "fb.com", "fb.watch", "m.facebook.com",
  "instagram.com", "instagr.am",
  "twitter.com", "x.com",
  "reddit.com", "v.redd.it",
  "twitch.tv", "clips.twitch.tv",
  "dailymotion.com", "dai.ly",
  "vimeo.com", "streamable.com",
  "snapchat.com", "pinterest.com", "pin.it"
];

function isSupportedLink(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SUPPORTED_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}

function ytdlpDownload(url, outBase) {
  return new Promise((resolve, reject) => {
    const args = [
      "--no-playlist", "--no-warnings",
      "--socket-timeout", "20", "--retries", "3", "--fragment-retries", "3",
      "--no-part", "--restrict-filenames",
      "-f", "best[ext=mp4][height<=720]/best[ext=mp4]/bv*[height<=720]+ba/best",
      "--merge-output-format", "mp4",
      "--print", "after_move:%(title).80s",
      "-o", outBase + ".%(ext)s",
      url
    ];
    execFile(YTDLP, args, { timeout: 180000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr?.slice(-200) || err.message));
      const dir = path.dirname(outBase);
      const base = path.basename(outBase);
      try {
        const found = fs.readdirSync(dir).find(f => f.startsWith(base + "."));
        if (found) {
          const title = (stdout || "").toString().trim().split("\n").pop() || "Video File";
          return resolve({ filePath: path.join(dir, found), title });
        }
      } catch (_) {}
      reject(new Error("file not found after download"));
    });
  });
}

async function trySagor(url) {
  if (!sagorDownloadVideo) return null;
  try {
    const r = await sagorDownloadVideo(url);
    if (!r || !r.filePath || !fs.existsSync(r.filePath)) return null;
    const dest = path.join(TMP_DIR, `sagor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp4`);
    try { fs.renameSync(r.filePath, dest); } catch { fs.copyFileSync(r.filePath, dest); try { fs.unlinkSync(r.filePath); } catch (_) {} }
    return { filePath: dest, title: r.title || "Video File" };
  } catch (e) {
    console.log(`[autolink] sagor failed for ${url}:`, e.message);
    return null;
  }
}

const _processing = new Set();

module.exports = {
  config: {
    name: "رابط-تلقائي",
    aliases: ["autolink"],
    version: "2.4",
    author: "Saint",
    countDown: 0,
    role: 0,
    shortDescription: "تنزيل وإرسال الفيديوهات تلقائياً من أي رابط في الغروب",
    category: "media",
  },

  onStart: async function () {},

  onChat: async function ({ api, event }) {
    if (!event) return;
    if (event.senderID === api.getCurrentUserID()) return;

    const { threadID, messageID } = event;
    const body = event.body || "";

    const collected = new Set();
    const bodyMatches = body.match(/(https?:\/\/[^\s<>]+)/g);
    if (bodyMatches) bodyMatches.forEach(u => collected.add(u));

    if (Array.isArray(event.attachments)) {
      for (const att of event.attachments) {
        const candidates = [
          att?.url, att?.facebookUrl, att?.source,
          att?.target?.url, att?.title, att?.description
        ].filter(v => typeof v === "string");
        for (const c of candidates) {
          const m = c.match(/(https?:\/\/[^\s<>"']+)/g);
          if (m) m.forEach(u => collected.add(u));
        }
      }
    }

    if (collected.size === 0) return;

    const cleaned = [...collected].map(u => {
      try {
        const parsed = new URL(u);
        if (parsed.hostname.includes("l.facebook.com") || parsed.hostname.includes("lm.facebook.com")) {
          const real = parsed.searchParams.get("u");
          if (real) return decodeURIComponent(real);
        }
        return u;
      } catch { return u; }
    });

    const links = [...new Set(cleaned)].filter(isSupportedLink);
    if (links.length === 0) return;

    const key = `${threadID}:${messageID}`;
    if (_processing.has(key)) return;
    _processing.add(key);

    try { api.setMessageReaction("⏳", messageID, () => {}, true); } catch (_) {}

    let successCount = 0;
    let failCount = 0;

    for (const url of links.slice(0, 3)) {
      const outBase = path.join(TMP_DIR, `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      let downloaded = null;
      try {
        downloaded = await trySagor(url);

        if (!downloaded) {
          try {
            downloaded = await ytdlpDownload(url, outBase);
          } catch (e) {
            console.log(`[autolink] ytdlp failed for ${url}:`, e.message);
          }
        }

        if (!downloaded || !downloaded.filePath || !fs.existsSync(downloaded.filePath)) {
          failCount++;
          continue;
        }

        const stats = fs.statSync(downloaded.filePath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > MAX_MB) {
          try { fs.unlinkSync(downloaded.filePath); } catch (_) {}
          failCount++;
          continue;
        }

        await new Promise((res) => {
          api.sendMessage(
            {
              body:
`📥 ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ
━━━━━━━━━━━━━━━
🎬 ᴛɪᴛʟᴇ: ${downloaded.title || "Video File"}
📦 sɪᴢᴇ: ${sizeMB.toFixed(2)} MB
━━━━━━━━━━━━━━━`,
              attachment: fs.createReadStream(downloaded.filePath)
            },
            threadID,
            () => {
              try { fs.unlinkSync(downloaded.filePath); } catch (_) {}
              res();
            },
            messageID
          );
        });

        successCount++;
      } catch (e) {
        console.log(`[autolink] error for ${url}:`, e.message);
        try { if (downloaded?.filePath && fs.existsSync(downloaded.filePath)) fs.unlinkSync(downloaded.filePath); } catch (_) {}
        failCount++;
      }
    }

    const finalReaction =
      successCount > 0 && failCount === 0 ? "✅" :
      successCount > 0 ? "⚠️" : "❌";

    try { api.setMessageReaction(finalReaction, messageID, () => {}, true); } catch (_) {}
    _processing.delete(key);
  }
};
