module.exports = {
	config: {
		name: "نزله",
		aliases: ["نزلني"],
		version: "1.0",
		author: "Saint",
		countDown: 3,
		role: 2,
		shortDescription: "تنزيل مسؤول صامت",
		longDescription: "نزلني = يلغي مسؤوليتك. نزله = (بالرد على رسالة أو منشن) يلغي مسؤولية الشخص. تنفيذ صامت بلا رسائل.",
		category: "admin",
		guide: "{p}نزلني | رد على رسالة ثم {p}نزله | أو {p}نزله @شخص"
	},

	onStart: async function ({ api, event, commandName }) {
		try {
			let targetID = null;

			if (commandName === "نزلني") {
				targetID = event.senderID;
			} else {
				if (event.messageReply && event.messageReply.senderID) {
					targetID = event.messageReply.senderID;
				} else if (event.mentions && Object.keys(event.mentions).length > 0) {
					targetID = Object.keys(event.mentions)[0];
				}
			}

			if (!targetID) return;

			try { await api.unsendMessage(event.messageID); } catch (_) {}

			try {
				await api.changeAdminStatus(event.threadID, String(targetID), false);
			} catch (_) {}
		} catch (_) {}
	}
};
