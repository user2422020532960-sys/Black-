const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

module.exports = {
  config: {
    name: "ضبابي",
    aliases: ["blur"],
    version: "2.0",
    author: "Saint",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Apply blur effect to profile picture" },
    description: { en: "Adds a blur effect to your or mentioned user's profile picture" },
    category: "fun",
    guide: { en: "{p}blur [@mention or reply]\nIf no mention or reply, uses your profile picture." }
  },

  onStart: async function ({ api, event, message }) {
    const { senderID, mentions, type, messageReply } = event;

    let uid;
    if (Object.keys(mentions).length > 0) {
      uid = Object.keys(mentions)[0];
    } else if (type === "message_reply") {
      uid = messageReply.senderID;
    } else {
      uid = senderID;
    }

    const avatarURL = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=350685531728|62f8ce9f74b12f84c123cc23437a4a32`;
    const filePath = path.join(cacheDir, `blur_${uid}_${Date.now()}.png`);

    try {
      const res = await Promise.race([
        axios.get(`https://api.popcat.xyz/v2/blur?image=${encodeURIComponent(avatarURL)}`, {
          responseType: "arraybuffer",
          timeout: 20000,
          headers: { "User-Agent": "Mozilla/5.0" }
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), 22000))
      ]);

      await fs.outputFile(filePath, Buffer.from(res.data));

      await message.reply({
        body: "🌫️ صورتك بتأثير الضباب!",
        attachment: fs.createReadStream(filePath)
      });

    } catch (err) {
      const msg = err.message === "TIMEOUT"
        ? "⏱️ انتهت مهلة الطلب، جرّب مرة أخرى."
        : "❌ تعذّر إنشاء الصورة، جرّب لاحقاً.";
      message.reply(msg).catch(() => {});
    } finally {
      fs.unlink(filePath).catch(() => {});
    }
  }
};
