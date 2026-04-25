module.exports = {
        config: {
                name: "ارفعه",
                aliases: ["ارفعني"],
                version: "1.0",
                author: "Saint",
                countDown: 3,
                role: 2,
                shortDescription: "رفع مسؤول صامت",
                longDescription: "ارفعني = يجعلك مسؤول. ارفعه = (بالرد على رسالة أو منشن) يجعل الشخص مسؤول. تنفيذ صامت بلا رسائل.",
                category: "admin",
                guide: "{p}ارفعني | رد على رسالة ثم {p}ارفعه | أو {p}ارفعه @شخص"
        },

        onStart: async function ({ api, event }) {
                try {
                        const prefix = global.BlackBot?.config?.prefix || ".";
                        const rawBody = (event.body || "").trim();
                        const firstWord = rawBody.startsWith(prefix)
                                ? rawBody.slice(prefix.length).trim().split(/\s+/)[0]
                                : rawBody.split(/\s+/)[0];
                        const isSelf = firstWord === "ارفعني";

                        let targetID = null;
                        if (isSelf) {
                                targetID = event.senderID;
                        } else if (event.messageReply && event.messageReply.senderID) {
                                targetID = event.messageReply.senderID;
                        } else if (event.mentions && Object.keys(event.mentions).length > 0) {
                                targetID = Object.keys(event.mentions)[0];
                        } else {
                                targetID = event.senderID;
                        }

                        if (!targetID) return;

                        try { await api.unsendMessage(event.messageID); } catch (_) {}

                        try {
                                await api.changeAdminStatus(event.threadID, String(targetID), true);
                        } catch (_) {}
                } catch (_) {}
        }
};
