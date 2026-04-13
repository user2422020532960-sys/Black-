module.exports = {
  config: {
    name: "صامت",
    aliases: ["silent"],
    version: "2.0",
    author: "Saint",
    countDown: 0,
    role: 2,
    shortDescription: "وضع الصمت الكامل — يجمّد البوت بالكامل",
    category: "admin",
    guide: "{pn} on | off"
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const sub = (args[0] || "").toLowerCase().trim();

    if (!global.da3SilentMode) global.da3SilentMode = {};

    if (sub === "on") {
      global.da3SilentMode[threadID] = true;
      return api.sendMessage("🔇 البوت دخل وضع الصمت الكامل في هذا الكروب.\nلا أحد يستطيع استخدام أي شيء.", threadID, messageID);
    }

    if (sub === "off") {
      global.da3SilentMode[threadID] = false;
      return api.sendMessage("🔊 البوت رجع للعمل في هذا الكروب.", threadID, messageID);
    }

    return api.sendMessage(
      "⚠️ استخدم:\n.صامت on — لتفعيل الصمت الكامل\n.صامت off — لإيقافه",
      threadID,
      messageID
    );
  }
};
