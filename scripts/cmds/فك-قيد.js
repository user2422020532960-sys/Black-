const path = require("path");
const mutedUsers = require(path.join(process.cwd(), "scripts", "data", "mutedUsersManager.js"));

module.exports = {
    config: {
        name: "فك-قيد",
        aliases: ["unmuteuser", "فك_قيد", "فك"],
        version: "1.0",
        author: "Saint",
        role: 2,
        shortDescription: "فك قيد مستخدم من قائمة التجاهل",
        category: "admin",
        guide: "{pn} [ID | رد على رسالته]"
    },

    onStart: async function({ message, args, event }) {
        const adminIDs = global.BlackBot?.config?.adminBot || [];
        if (!adminIDs.includes(event.senderID)) {
            return message.reply("❌ هذا الأمر للمطور فقط.");
        }

        let targetID = null;

        if (event.messageReply?.senderID) {
            targetID = event.messageReply.senderID;
        } else if (args[0] && !isNaN(args[0])) {
            targetID = args[0];
        } else if (Object.keys(event.mentions || {}).length) {
            targetID = Object.keys(event.mentions)[0];
        }

        if (!targetID) {
            return message.reply("⚠️ حدد المستخدم: رد على رسالته أو اكتب الـ ID بعد الأمر.");
        }

        if (!mutedUsers.isMuted(targetID)) {
            return message.reply(`⚠️ المستخدم (${targetID}) غير مقيّد.`);
        }

        mutedUsers.unmute(targetID);
        return message.reply(`✅ تم فك القيد عن المستخدم (${targetID}).`);
    }
};
