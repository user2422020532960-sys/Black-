const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const ytSearch = require("yt-search");

const CACHE_DIR = path.join(__dirname, "cache");
const NIX_API_URL = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

async function getApiBase() {
  const res = await axios.get(NIX_API_URL, { timeout: 8000 });
  return res.data.api;
}

async function downloadAudio(videoUrl, retries = 2) {
  const base = await getApiBase();
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.get(`${base}/ytdl`, {
        params: { url: videoUrl, type: "audio" },
        timeout: 25000
      });
      if (res.data.status && res.data.downloadUrl) return res.data;
      throw new Error("API لم يُرجع رابط تحميل");
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

module.exports = {
  config: {
    name: "اغنية",
    aliases: ["song", "music", "play", "موسيقى", "sing"],
    version: "2.0.0",
    author: "BlackBot",
    countDown: 10,
    role: 0,
    category: "media",
    guide: { ar: "{pn} <اسم الأغنية أو رابط>" }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID: t, messageID: m } = event;
    const q = args.join(" ").trim();
    if (!q) return api.sendMessage("❌ اكتب اسم الأغنية أو الرابط.", t, m);

    api.setMessageReaction("⏳", m, () => {}, true);

    try {
      let videoUrl = q;

      if (!q.startsWith("http")) {
        const r = await ytSearch(q);
        const v = r.videos[0];
        if (!v) throw new Error("لم يتم العثور على الأغنية");
        videoUrl = v.url;
      }

      const data = await downloadAudio(videoUrl);
      const title = data.title || "أغنية";
      const dlUrl = data.downloadUrl;

      await fs.ensureDir(CACHE_DIR);
      const outPath = path.join(CACHE_DIR, `${Date.now()}.mp3`);

      const fileRes = await axios.get(dlUrl, { responseType: "arraybuffer", timeout: 60000 });
      await fs.outputFile(outPath, Buffer.from(fileRes.data));

      api.setMessageReaction("✅", m, () => {}, true);

      return api.sendMessage({
        body: `🎵 ${title}`,
        attachment: fs.createReadStream(outPath)
      }, t, () => {
        try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
      }, m);

    } catch (e) {
      api.setMessageReaction("❌", m, () => {}, true);
      return api.sendMessage(`❌ فشل تحميل الأغنية: ${e.message}`, t, m);
    }
  }
};
