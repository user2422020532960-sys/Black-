const { writeFileSync } = require("fs-extra");

const HEADER = "◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈";
const LINE = "━━━━━━━━━━";

function box(title, body) {
  return `${HEADER}\n   〖 ✦ ${title} ✦ 〗\n${LINE}\n${body}\n${LINE}`;
}

module.exports = {
  config: {
    name: "addadmin",
    aliases: ["إضافة-مشرف", "اضافة-مشرف"],
    version: "1.1",
    author: "Saint",
    countDown: 3,
    role: 2,
    shortDescription: "ترقية مشرف للبوت",
    longDescription: "إضافة مشرف بالرد أو بالـID أو بالمنشن",
    category: "box chat",
    guide: {
      ar: "{pn} (رد على رسالة)\n{pn} <id1> <id2>\n{pn} @tag"
    }
  },

  langs: {
    ar: {
      missing: "〔!〕 رد على رسالة شخص أو ضع ID/منشن"
    }
  },

  onStart: async function ({ message, args, event, usersData, getLang }) {
    const config = global.BlackBot.config;
    if (!Array.isArray(config.adminBot)) config.adminBot = [];

    let uids = [];
    if (event.messageReply && event.messageReply.senderID) uids.push(String(event.messageReply.senderID));
    if (event.mentions && Object.keys(event.mentions).length > 0) uids.push(...Object.keys(event.mentions));
    for (const a of args) {
      const cleaned = String(a).replace(/[^0-9]/g, "");
      if (cleaned && cleaned.length >= 5) uids.push(cleaned);
    }
    uids = [...new Set(uids.map(String))];

    if (uids.length === 0) return message.reply(getLang("missing"));

    const newlyAdded = [], already = [];
    for (const uid of uids) {
      if (config.adminBot.includes(uid)) already.push(uid);
      else { config.adminBot.push(uid); newlyAdded.push(uid); }
    }

    try {
      writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
    } catch (e) {
      return message.reply(box("خطأ", ` ◈ فشل الحفظ ↞ ${e.message}`));
    }

    const getName = async uid => { try { return await usersData.getName(uid); } catch { return uid; } };
    const fmt = async list => (await Promise.all(list.map(async u => ` 「+」↞〔${await getName(u)}〕\n         ◈ ${u}`))).join("\n");

    let body = "";
    if (newlyAdded.length) body += `   ◆ تمت الترقية [${newlyAdded.length}]\n${await fmt(newlyAdded)}`;
    if (already.length) body += `${newlyAdded.length ? "\n" : ""}   ◆ مشرفون مسبقاً [${already.length}]\n${await fmt(already)}`;

    return message.reply(box("ترقية مشرف", body));
  }
};
