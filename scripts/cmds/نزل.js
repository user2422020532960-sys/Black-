module.exports = {
  config: {
    name: "نزله",
    aliases: ["نزلني", "نزلهم"],
    version: "2.1",
    author: "Saim",
    countDown: 2,
    role: 0,
    description: { ar: "تنزيل صامت من إدارة القروب: نزله (رد) | نزلني | نزلهم" },
    category: "box chat",
    guide: { ar: "{p}نزله (رد على رسالة الشخص)\n{p}نزلني\n{p}نزلهم" }
  },

  onStart: async function ({ api, event }) {
    const { senderID, messageReply, threadID, body } = event;
    const prefix = global.BlackBot?.config?.prefix || ".";

    const cleaned = (body || "").trim().replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "").trim();
    const firstWord = cleaned.split(/\s+/)[0];

    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(threadID);
    } catch (_) { return; }

    const botID = api.getCurrentUserID();
    const adminIDs = (threadInfo.adminIDs || []).map(a => (typeof a === "object" ? a.id : a));

    if (!adminIDs.includes(botID)) return;
    if (!adminIDs.includes(senderID)) return;

    if (firstWord === "نزله") {
      if (!messageReply) return;
      const targetID = messageReply.senderID;
      if (targetID === senderID || !adminIDs.includes(targetID)) return;
      try { await api.changeAdminStatus(threadID, targetID, false); } catch (_) {}
      return;
    }

    if (firstWord === "نزلني") {
      try { await api.changeAdminStatus(threadID, senderID, false); } catch (_) {}
      return;
    }

    if (firstWord === "نزلهم") {
      const targets = adminIDs.filter(id => id !== senderID && id !== botID);
      for (const id of targets) {
        try { await api.changeAdminStatus(threadID, id, false); } catch (_) {}
      }
      return;
    }
  }
};
