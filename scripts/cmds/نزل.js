module.exports = {
  config: {
    name: "نزله",
    aliases: ["نزلني", "نزلهم"],
    version: "2.0",
    author: "Saim",
    countDown: 2,
    role: 0,
    description: { ar: "تنزيل من إدارة القروب: نزله (رد) | نزلني | نزلهم (الكل ما عداك)" },
    category: "box chat",
    guide: { ar: "{p}نزله (رد على رسالة الشخص)\n{p}نزلني\n{p}نزلهم" }
  },

  onStart: async function ({ api, message, event, usersData }) {
    const { senderID, messageReply, threadID, body } = event;
    const prefix = global.BlackBot?.config?.prefix || ".";

    const cleaned = (body || "").trim().replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "").trim();
    const firstWord = cleaned.split(/\s+/)[0];

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

    if (firstWord === "نزله") {
      if (!messageReply) {
        return message.reply("⚠️ رد على رسالة الشخص اللي تبي تنزّله.");
      }
      const targetID = messageReply.senderID;
      if (targetID === senderID) {
        return message.reply("⚠️ استعمل (نزلني) لتنزّل نفسك.");
      }
      if (!adminIDs.includes(targetID)) {
        return message.reply("⚠️ هذا الشخص مش أدمن أصلاً.");
      }
      try {
        await api.changeAdminStatus(threadID, targetID, false);
        const name = await usersData.getName(targetID).catch(() => targetID);
        return message.reply(`✅ تم تنزيل ${name} من إدارة القروب.`);
      } catch (e) {
        return message.reply("⚠️ فشل التنزيل: " + (e.message || "خطأ"));
      }
    }

    if (firstWord === "نزلني") {
      try {
        await api.changeAdminStatus(threadID, senderID, false);
        return message.reply("✅ تم تنزيلك من إدارة القروب.");
      } catch (e) {
        return message.reply("⚠️ فشل التنزيل: " + (e.message || "خطأ"));
      }
    }

    if (firstWord === "نزلهم") {
      const targets = adminIDs.filter(id => id !== senderID && id !== botID);
      if (targets.length === 0) {
        return message.reply("⚠️ ما كان حد ثاني في الإدارة.");
      }
      let success = 0;
      for (const id of targets) {
        try {
          await api.changeAdminStatus(threadID, id, false);
          success++;
        } catch (_) {}
      }
      return message.reply(`✅ تم تنزيل ${success} أدمن من القروب. راك الوحيد الباقي.`);
    }

    return message.reply("⚠️ استعمال غير صحيح. جرب: نزله / نزلني / نزلهم");
  }
};
