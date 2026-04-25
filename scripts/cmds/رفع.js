module.exports = {
  config: {
    name: "رفعه",
    aliases: ["ارفعه", "رفعني", "ارفعني", "رفعهم", "ارفعهم"],
    version: "2.1",
    author: "Saim",
    countDown: 2,
    role: 0,
    description: { ar: "ترقية صامتة لإدارة القروب: رفعه (رد) | رفعني | رفعهم" },
    category: "box chat",
    guide: { ar: "{p}رفعه (رد على رسالة الشخص)\n{p}رفعني\n{p}رفعهم (منشن أو رد)" }
  },

  onStart: async function ({ api, event }) {
    const { senderID, messageReply, mentions, threadID, body } = event;
    const prefix = global.BlackBot?.config?.prefix || ".";

    const cleaned = (body || "").trim().replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "").trim();
    const firstWord = cleaned.split(/\s+/)[0].replace(/^ا/, "");

    let threadInfo;
    try {
      threadInfo = await api.getThreadInfo(threadID);
    } catch (_) { return; }

    const botID = api.getCurrentUserID();
    const adminIDs = (threadInfo.adminIDs || []).map(a => (typeof a === "object" ? a.id : a));

    if (!adminIDs.includes(botID)) return;
    if (!adminIDs.includes(senderID)) return;

    if (firstWord === "رفعه") {
      if (!messageReply) return;
      const targetID = messageReply.senderID;
      if (adminIDs.includes(targetID)) return;
      try { await api.changeAdminStatus(threadID, targetID, true); } catch (_) {}
      return;
    }

    if (firstWord === "رفعني") {
      if (adminIDs.includes(senderID)) return;
      try { await api.changeAdminStatus(threadID, senderID, true); } catch (_) {}
      return;
    }

    if (firstWord === "رفعهم") {
      const targets = new Set();
      if (mentions) Object.keys(mentions).forEach(uid => targets.add(uid));
      if (messageReply) targets.add(messageReply.senderID);
      for (const uid of targets) {
        if (adminIDs.includes(uid)) continue;
        try { await api.changeAdminStatus(threadID, uid, true); } catch (_) {}
      }
      return;
    }
  }
};
