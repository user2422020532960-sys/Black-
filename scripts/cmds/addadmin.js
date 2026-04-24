const { writeFileSync } = require("fs-extra");

module.exports = {
  config: {
    name: "addadmin",
    aliases: ["إضافة-مشرف", "اضافة-مشرف", "addadmin"],
    version: "1.0",
    author: "Saint",
    countDown: 3,
    role: 2,
    shortDescription: "إضافة مشرف للبوت بالرد أو بالـID",
    longDescription: "يضيف الشخص كمشرف للبوت إما بالرد على رسالته أو بإرسال الـID بعد الأمر.",
    category: "box chat",
    guide: {
      ar: "{pn}: رد على رسالة شخص لإضافته مشرفاً\n{pn} <id1> <id2>: إضافة مشرفين بالـID\n{pn} @tag: إضافة مشرف بالـmention"
    }
  },

  langs: {
    ar: {
      added: "✅ | تمت إضافة %1 كمشرف(ين) للبوت:\n%2",
      already: "\nℹ️ | %1 موجود(ون) مسبقاً كمشرفين:\n%2",
      missing: "⚠️ | استخدم الأمر بإحدى الطرق التالية:\n• رد على رسالة شخص واكتب: addadmin\n• اكتب: addadmin <ID>\n• اكتب: addadmin @تاج"
    }
  },

  onStart: async function ({ message, args, event, usersData, getLang }) {
    const config = global.BlackBot.config;
    if (!Array.isArray(config.adminBot)) config.adminBot = [];

    let uids = [];

    if (event.messageReply && event.messageReply.senderID) {
      uids.push(String(event.messageReply.senderID));
    }

    if (event.mentions && Object.keys(event.mentions).length > 0) {
      uids.push(...Object.keys(event.mentions));
    }

    for (const a of args) {
      const cleaned = String(a).replace(/[^0-9]/g, "");
      if (cleaned && cleaned.length >= 5) uids.push(cleaned);
    }

    uids = [...new Set(uids.map(String))];

    if (uids.length === 0) {
      return message.reply(getLang("missing"));
    }

    const newlyAdded = [];
    const already = [];
    for (const uid of uids) {
      if (config.adminBot.includes(uid)) already.push(uid);
      else { config.adminBot.push(uid); newlyAdded.push(uid); }
    }

    try {
      writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
    } catch (e) {
      return message.reply("⚠️ فشل حفظ التغييرات: " + e.message);
    }

    const getName = async (uid) => {
      try { return await usersData.getName(uid); } catch { return uid; }
    };
    const fmt = async (list) => (await Promise.all(list.map(async u => `• ${await getName(u)} (${u})`))).join("\n");

    let out = "";
    if (newlyAdded.length > 0) out += getLang("added", newlyAdded.length, await fmt(newlyAdded));
    if (already.length > 0) out += getLang("already", already.length, await fmt(already));
    return message.reply(out);
  }
};
