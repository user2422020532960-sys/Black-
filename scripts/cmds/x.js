const { config } = global.BlackBot;
const { writeFileSync } = require("fs-extra");

const xIntervals = {};

module.exports = {
    config: {
        name: "x",
        aliases: [],
        version: "1.0",
        author: "Saint",
        countDown: 0,
        role: 2,
        shortDescription: "إرسال رسالة متكررة بنص مخصص",
        category: "owner",
        guide: "{pn} <الوقت>[s] | {pn} off"
    },

    onStart: async function ({ args, event, api }) {
        const { threadID, senderID } = event;
        const callerThreadID = event.callerThreadID || threadID;

        if (args[0] === "off") {
            if (!xIntervals[threadID]) {
                return api.sendMessage("〔✗〕 لا يوجد وضع مفعّل.", callerThreadID);
            }
            clearInterval(xIntervals[threadID]);
            delete xIntervals[threadID];
            config.adminOnly.enable = false;
            writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
            return api.sendMessage("〔✓〕 تم الإيقاف | الأوامر متاحة للجميع", callerThreadID);
        }

        const timeArg = args[0];
        if (!timeArg) {
            return api.sendMessage("〔!〕 مثال: .x 10s أو .x 2", callerThreadID);
        }

        let intervalMs;
        if (timeArg.toLowerCase().endsWith("s")) {
            const secs = parseInt(timeArg.slice(0, -1));
            if (isNaN(secs) || secs <= 0) return api.sendMessage("〔✗〕 وقت غير صحيح.", callerThreadID);
            intervalMs = secs * 1000;
        } else {
            const mins = parseInt(timeArg);
            if (isNaN(mins) || mins <= 0) return api.sendMessage("〔✗〕 وقت غير صحيح.", callerThreadID);
            intervalMs = mins * 60 * 1000;
        }

        const timeLabel = intervalMs >= 60000
            ? `${intervalMs / 60000} دقيقة`
            : `${intervalMs / 1000} ثانية`;

        api.sendMessage(
            `〔!〕 أرسل النص | كل ${timeLabel}`,
            callerThreadID,
            (err, info) => {
                if (err || !info) return;
                global.BlackBot.onReply.set(info.messageID, {
                    commandName: "x",
                    messageID: info.messageID,
                    author: String(senderID),
                    intervalMs,
                    targetThreadID: threadID,
                    callerThreadID
                });
                setTimeout(() => global.BlackBot.onReply.delete(info.messageID), 120000);
            }
        );
    },

    onReply: async function ({ api, event, Reply }) {
        if (String(event.senderID) !== String(Reply.author)) return;

        const { intervalMs, targetThreadID, callerThreadID } = Reply;
        const text = (event.body || "").trim();

        global.BlackBot.onReply.delete(Reply.messageID);

        if (!text) {
            return api.sendMessage("〔✗〕 النص فارغ.", callerThreadID);
        }

        if (xIntervals[targetThreadID]) {
            clearInterval(xIntervals[targetThreadID]);
            delete xIntervals[targetThreadID];
        }

        config.adminOnly.enable = true;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

        const timeLabel = intervalMs >= 60000
            ? `${intervalMs / 60000} دقيقة`
            : `${intervalMs / 1000} ثانية`;

        api.sendMessage(
            `〔✓〕 مفعّل | كل ${timeLabel} | الأوامر مقفلة`,
            callerThreadID
        );

        const CHUNK_SIZE = 1800;
        const sendText = async (tid) => {
            if (text.length <= CHUNK_SIZE) {
                api.sendMessage(text, tid).catch(() => {});
            } else {
                let i = 0, idx = 0;
                while (i < text.length) {
                    const chunk = text.slice(i, i + CHUNK_SIZE);
                    await new Promise(r => setTimeout(r, idx * 500));
                    api.sendMessage(chunk, tid).catch(() => {});
                    i += CHUNK_SIZE;
                    idx++;
                }
            }
        };

        xIntervals[targetThreadID] = setInterval(() => {
            if (!xIntervals[targetThreadID]) return;
            sendText(targetThreadID);
        }, intervalMs);
    }
};
