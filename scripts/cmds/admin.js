const { config } = global.BlackBot;
const { writeFileSync } = require("fs-extra");

const HEADER = "◈  ⌯ ⟅𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ 𖥻 ❦៹ .˖ִ.◈";
const LINE = "━━━━━━━━━━";
const UNKNOWN = "حساب غير معروف";

function box(title, body) {
        return `${HEADER}\n   〖 ✦ ${title} ✦ 〗\n${LINE}\n${body}\n${LINE}`;
}

function clean(name) {
        if (name === undefined || name === null) return null;
        const s = String(name).trim();
        if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
        return s;
}

async function resolveName(uid, api, usersData) {
        uid = String(uid);
        // 1. جرب api.getUserInfo بشكل مفرد
        try {
                const info = await api.getUserInfo(uid);
                const n = clean(info?.[uid]?.name);
                if (n) return n;
        } catch (e) {}
        // 2. جرب قاعدة البيانات المحلية
        try {
                const n = clean(await usersData.getName(uid));
                if (n && n !== uid) return n;
        } catch (e) {}
        // 3. جرب جلب من فيسبوك مباشرة (checkData=false)
        try {
                const n = clean(await usersData.getName(uid, false));
                if (n && n !== uid) return n;
        } catch (e) {}
        return UNKNOWN;
}

module.exports = {
        config: {
                name: "مشرف",
                aliases: ["admin", "ترتيب"],
                version: "1.7",
                author: "Saint",
                countDown: 5,
                role: 2,
                shortDescription: "إدارة مشرفي البوت",
                longDescription: "إضافة/حذف/عرض مشرفي البوت",
                category: "box chat",
                guide: {
                        ar: "{pn}: عرض المشرفين\n{pn} -a <id|@tag>: إضافة\n{pn} -r <id|@tag>: حذف"
                }
        },

        langs: {
                ar: {
                        missingIdAdd: "〔!〕 أرسل ID أو منشن للشخص المراد ترقيته",
                        missingIdRemove: "〔!〕 أرسل ID أو منشن للشخص المراد إنزاله"
                }
        },

        onStart: async function ({ message, args, usersData, event, getLang, commandName, api }) {
                const sub = (args[0] || "").toLowerCase();

                // أمر "ترتيب" أو بدون وسائط أو list → عرض المشرفين بنمط لاست
                if (commandName === "ترتيب" || !sub || sub === "list" || sub === "-l" || sub === "قائمة") {
                        const ids = (config.adminBot || []).map(String);
                        let body;
                        if (ids.length === 0) {
                                body = "   ◆ لا يوجد مشرفون";
                        } else {
                                const names = await Promise.all(ids.map(uid => resolveName(uid, api, usersData)));
                                body = names.map((name, i) => ` 「${i + 1}」↞〔${name}〕\n         ◈ ${ids[i]}`).join("\n");
                        }
                        return message.reply(box(`قائمة المشرفين [${ids.length}]`, body));
                }

                switch (sub) {
                        case "add":
                        case "-a":
                        case "اضف":
                        case "إضافة": {
                                if (!args[1] && !event.messageReply && Object.keys(event.mentions).length === 0)
                                        return message.reply(getLang("missingIdAdd"));

                                let uids = [];
                                if (Object.keys(event.mentions).length > 0)
                                        uids = Object.keys(event.mentions);
                                else if (event.messageReply)
                                        uids.push(event.messageReply.senderID);
                                else
                                        uids = args.filter(a => !isNaN(a));

                                const adminIds = [], notAdminIds = [];
                                for (const uid of uids) {
                                        if (config.adminBot.includes(uid)) adminIds.push(uid);
                                        else notAdminIds.push(uid);
                                }
                                config.adminBot.push(...notAdminIds);
                                writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

                                const names = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name })).catch(() => ({ uid, name: uid }))));
                                const fmt = list => list.map(uid => {
                                        const n = names.find(x => x.uid === uid);
                                        return ` 「+」↞〔${n ? n.name : uid}〕\n         ◈ ${uid}`;
                                }).join("\n");

                                let body = "";
                                if (notAdminIds.length) body += `   ◆ تمت ترقية ${notAdminIds.length}\n${fmt(notAdminIds)}`;
                                if (adminIds.length) body += `${notAdminIds.length ? "\n" : ""}   ◆ مشرفون مسبقاً [${adminIds.length}]\n${fmt(adminIds)}`;
                                return message.reply(box("ترقية مشرفين", body));
                        }

                        case "remove":
                        case "-r":
                        case "حذف":
                        case "ازل":
                        case "إزالة": {
                                if (!args[1] && Object.keys(event.mentions).length === 0)
                                        return message.reply(getLang("missingIdRemove"));

                                let uids = [];
                                if (Object.keys(event.mentions).length > 0)
                                        uids = Object.keys(event.mentions);
                                else
                                        uids = args.filter(a => !isNaN(a));

                                const adminIds = [], notAdminIds = [];
                                for (const uid of uids) {
                                        if (config.adminBot.includes(uid)) adminIds.push(uid);
                                        else notAdminIds.push(uid);
                                }
                                for (const uid of adminIds)
                                        config.adminBot.splice(config.adminBot.indexOf(uid), 1);
                                writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

                                const names = await Promise.all(adminIds.map(uid => usersData.getName(uid).then(name => ({ uid, name })).catch(() => ({ uid, name: uid }))));
                                const fmt = list => list.map(uid => {
                                        const n = names.find(x => x.uid === uid);
                                        return ` 「-」↞〔${n ? n.name : uid}〕\n         ◈ ${uid}`;
                                }).join("\n");

                                let body = "";
                                if (adminIds.length) body += `   ◆ تم الإنزال [${adminIds.length}]\n${fmt(adminIds)}`;
                                if (notAdminIds.length) body += `${adminIds.length ? "\n" : ""}   ◆ ليسوا مشرفين [${notAdminIds.length}]\n${notAdminIds.map(u => ` 「✗」↞ ${u}`).join("\n")}`;
                                return message.reply(box("إنزال مشرفين", body));
                        }

                        default:
                                return message.reply(box("شرح الأمر", ` ◈ مشرف        ↞ عرض المشرفين\n ◈ مشرف -a [id] ↞ ترقية\n ◈ مشرف -r [id] ↞ إنزال\n ◈ ترتيب        ↞ عرض المشرفين`));
                }
        }
};
