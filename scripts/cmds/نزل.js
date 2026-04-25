const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "نزله",
    aliases: ["نزلني", "نزلهم"],
    version: "1.0",
    author: "Saim",
    countDown: 2,
    role: 2,
    description: { ar: "إزالة سريعة من المسؤولين: نزله (رد على رسالة) | نزلني | نزلهم (الكل ما عداك)" },
    category: "box chat",
    guide: { ar: "{p}نزله (رد على رسالة الشخص)\n{p}نزلني\n{p}نزلهم" }
  },

  onStart: async function ({ message, event, usersData }) {
    const { config } = global.BlackBot;
    const { senderID, messageReply, body } = event;
    const prefix = global.BlackBot?.config?.prefix || ".";

    const cleaned = (body || "").trim().replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "").trim();
    const firstWord = cleaned.split(/\s+/)[0];

    const removeAdmin = (uid) => {
      const idx = config.adminBot.indexOf(uid);
      if (idx !== -1) {
        config.adminBot.splice(idx, 1);
        return true;
      }
      return false;
    };

    const persist = () => {
      try { writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2)); } catch (_) {}
    };

    if (firstWord === "نزله") {
      if (!messageReply) {
        return message.reply("⚠️ رد على رسالة الشخص اللي تبي تنزّله.");
      }
      const targetID = messageReply.senderID;
      if (targetID === senderID) {
        return message.reply("⚠️ استعمل (نزلني) لتنزّل نفسك.");
      }
      if (!config.adminBot.includes(targetID)) {
        return message.reply("⚠️ هذا الشخص ما هو مسؤول أصلاً.");
      }
      removeAdmin(targetID);
      persist();
      const name = await usersData.getName(targetID).catch(() => targetID);
      return message.reply(`✅ تم تنزيل ${name} من المسؤولين.`);
    }

    if (firstWord === "نزلني") {
      if (!config.adminBot.includes(senderID)) {
        return message.reply("⚠️ راك مش مسؤول أصلاً.");
      }
      removeAdmin(senderID);
      persist();
      return message.reply("✅ تم تنزيلك من المسؤولين.");
    }

    if (firstWord === "نزلهم") {
      const before = config.adminBot.length;
      config.adminBot = config.adminBot.filter(uid => uid === senderID);
      const removedCount = before - config.adminBot.length;
      persist();
      if (removedCount === 0) {
        return message.reply("⚠️ ما كان حد ثاني في المسؤولين.");
      }
      return message.reply(`✅ تم تنزيل ${removedCount} مسؤول. راك الوحيد الباقي.`);
    }

    return message.reply("⚠️ استعمال غير صحيح. جرب: نزله / نزلني / نزلهم");
  }
};
