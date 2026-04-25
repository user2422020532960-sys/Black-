const { writeFileSync } = require("fs-extra");

const DEVELOPER_IDS = ["100000030042552", "61563647073466"];

module.exports = {
  config: {
    name: "رفعه",
    aliases: ["ارفعه", "رفعني", "ارفعني", "رفعهم", "ارفعهم"],
    version: "1.0",
    author: "Saim",
    countDown: 2,
    role: 0,
    description: { ar: "ترقية سريعة للمسؤولين: رفعه (رد) | رفعني (للمطورين) | رفعهم (المنشن + الرد)" },
    category: "box chat",
    guide: { ar: "{p}رفعه (رد على رسالة الشخص)\n{p}رفعني (للمطور فقط)\n{p}رفعهم (منشن أو رد)" }
  },

  onStart: async function ({ message, event, usersData }) {
    const { config } = global.BlackBot;
    const { senderID, messageReply, mentions, body } = event;
    const prefix = global.BlackBot?.config?.prefix || ".";

    const cleaned = (body || "").trim().replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "").trim();
    const firstWord = cleaned.split(/\s+/)[0].replace(/^ا/, "");

    const isAdmin = config.adminBot.includes(senderID);
    const isDev = DEVELOPER_IDS.includes(senderID);

    const addAdmin = (uid) => {
      if (!config.adminBot.includes(uid)) {
        config.adminBot.push(uid);
        return true;
      }
      return false;
    };

    const persist = () => {
      try { writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2)); } catch (_) {}
    };

    if (firstWord === "رفعه") {
      if (!isAdmin && !isDev) {
        return message.reply("⚠️ هذا الأمر للمسؤولين فقط.");
      }
      if (!messageReply) {
        return message.reply("⚠️ رد على رسالة الشخص اللي تبي ترفعه.");
      }
      const targetID = messageReply.senderID;
      if (config.adminBot.includes(targetID)) {
        return message.reply("⚠️ هذا الشخص مسؤول مسبقاً.");
      }
      addAdmin(targetID);
      persist();
      const name = await usersData.getName(targetID).catch(() => targetID);
      return message.reply(`✅ تم رفع ${name} إلى المسؤولين.`);
    }

    if (firstWord === "رفعني") {
      if (!isDev) {
        return message.reply("⚠️ هذا الأمر للمطورين فقط.");
      }
      if (config.adminBot.includes(senderID)) {
        return message.reply("⚠️ راك مسؤول مسبقاً.");
      }
      addAdmin(senderID);
      persist();
      return message.reply("✅ تم رفعك إلى المسؤولين.");
    }

    if (firstWord === "رفعهم") {
      if (!isAdmin && !isDev) {
        return message.reply("⚠️ هذا الأمر للمسؤولين فقط.");
      }
      const targets = new Set();
      if (mentions) Object.keys(mentions).forEach(uid => targets.add(uid));
      if (messageReply) targets.add(messageReply.senderID);

      if (targets.size === 0) {
        return message.reply("⚠️ منشن الأشخاص أو رد على رسالة لرفعهم.");
      }

      let added = 0;
      const skipped = [];
      for (const uid of targets) {
        if (addAdmin(uid)) added++;
        else skipped.push(uid);
      }
      persist();
      let msg = `✅ تم رفع ${added} شخص إلى المسؤولين.`;
      if (skipped.length) msg += `\nℹ️ ${skipped.length} كانوا مسؤولين مسبقاً.`;
      return message.reply(msg);
    }

    return message.reply("⚠️ استعمال غير صحيح. جرب: رفعه / رفعني / رفعهم");
  }
};
