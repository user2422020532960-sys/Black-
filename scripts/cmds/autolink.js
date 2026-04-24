const fs = require("fs");
const { downloadVideo } = require("sagor-video-downloader");

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

const _processing = new Set();

module.exports = {
  config: {
    name: "رابط-تلقائي",
    aliases: ["autolink"],
    version: "2.3",
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
      let filePath = null;
      try {
        const result = await downloadVideo(url);
        filePath = result?.filePath;
        const title = result?.title;

        if (!filePath || !fs.existsSync(filePath)) throw new Error("file not found");

        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);

        if (fileSizeInMB > 80) {
          try { fs.unlinkSync(filePath); } catch (_) {}
          failCount++;
          continue;
        }

        await new Promise((res) => {
          api.sendMessage(
            {
              body:
`📥 ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ
━━━━━━━━━━━━━━━
🎬 ᴛɪᴛʟᴇ: ${title || "Video File"}
📦 sɪᴢᴇ: ${fileSizeInMB.toFixed(2)} MB
━━━━━━━━━━━━━━━`,
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

        successCount++;
      } catch (e) {
        console.log(`[autolink] failed for ${url}:`, e.message);
        try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
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
