module.exports = {
  config: {
    name: "رفعه",
    aliases: ["ارفعه", "رفعني", "ارفعني", "رفعهم", "ارفعهم"],
    version: "2.0",
    author: "Saim",
    countDown: 2,
    role: 0,
    description: { ar: "ترقية أدمن القروب: رفعه (رد) | رفعني | رفعهم (المنشن أو الرد)" },
    category: "box chat",
    guide: { ar: "{p}رفعه (رد على رسالة الشخص)\n{p}رفعني\n{p}رفعهم (منشن أو رد)" }
  },

  onStart: async function ({ api, message, event, usersData }) {
    const { senderID, messageReply, mentions, threadID, body } = event;
    const prefix = global.BlackBot?.config?.prefix || ".";

    const cleaned = (body || "").trim().replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "").trim();
    const firstWord = cleaned.split(/\s+/)[0].replace(/^ا/, "");

    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(threadID);
    } catch (e) {
      return message.reply("⚠️ ما قدرت أجيب معلومات القروب.");
    }

    const botID = api.getCurrentUserID();
    const adminIDs = (threadInfo.adminIDs || []).map(a => (typeof a === "object" ? a.id : a));

    if (!adminIDs.includes(botID)) {
      return message.reply("⚠️ البوت مش أدمن في القروب، ما يقدر يغيّر الإدارة.");
    }
    if (!adminIDs.includes(senderID)) {
      return message.reply("⚠️ راك مش أدمن في القروب.");
    }

    if (firstWord === "رفعه") {
      if (!messageReply) {
        return message.reply("⚠️ رد على رسالة الشخص اللي تبي ترفعه.");
      }
      const targetID = messageReply.senderID;
      if (adminIDs.includes(targetID)) {
        return message.reply("⚠️ هذا الشخص أدمن مسبقاً.");
      }
      try {
        await api.changeAdminStatus(threadID, targetID, true);
        const name = await usersData.getName(targetID).catch(() => targetID);
        return message.reply(`✅ تم رفع ${name} إلى إدارة القروب.`);
      } catch (e) {
        return message.reply("⚠️ فشل الرفع: " + (e.message || "خطأ"));
      }
    }

    if (firstWord === "رفعني") {
      if (adminIDs.includes(senderID)) {
        return message.reply("⚠️ راك أدمن مسبقاً.");
      }
      try {
        await api.changeAdminStatus(threadID, senderID, true);
        return message.reply("✅ تم رفعك إلى إدارة القروب.");
      } catch (e) {
        return message.reply("⚠️ فشل الرفع: " + (e.message || "خطأ"));
      }
    }

    if (firstWord === "رفعهم") {
      const targets = new Set();
      if (mentions) Object.keys(mentions).forEach(uid => targets.add(uid));
      if (messageReply) targets.add(messageReply.senderID);

      if (targets.size === 0) {
        return message.reply("⚠️ منشن الأشخاص أو رد على رسالة لرفعهم.");
      }

      let success = 0, skipped = 0;
      for (const uid of targets) {
        if (adminIDs.includes(uid)) { skipped++; continue; }
        try {
          await api.changeAdminStatus(threadID, uid, true);
          success++;
        } catch (_) {}
      }
      let msg = `✅ تم رفع ${success} شخص لإدارة القروب.`;
      if (skipped) msg += `\nℹ️ ${skipped} كانوا أدمن مسبقاً.`;
      return message.reply(msg);
    }

    return message.reply("⚠️ استعمال غير صحيح. جرب: رفعه / رفعني / رفعهم");
  }
};
