const activeLoops = new Map();

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runLoop(api, threadID) {
  while (activeLoops.has(threadID)) {
    const currentName = activeLoops.get(threadID);
    try {
      await api.setTitle(currentName, threadID);
    } catch (_) {}
    await sleep(1000);
    if (!activeLoops.has(threadID)) break;
  }
}

module.exports = {
  config: {
    name: "نيم2",
    aliases: ["nimblack", "nim-black"],
    version: "1.0",
    author: "BlackBot",
    role: 1,
    shortDescription: "تغيير اسم المجموعة كل ثانية باستمرار",
    category: "group",
    guide: "{pn} [الاسم] | {pn} off",
    countDown: 3
  },

  onStart: async ({ api, event, args, message }) => {
    const { threadID } = event;
    const input = args.join(" ").trim();

    if (!input) {
      return message.reply(
        "⚠️ اكتب الاسم الجديد بعد الأمر.\n💡 لإيقاف: نيم بلاك off"
      );
    }

    if (input.toLowerCase() === "off") {
      if (!activeLoops.has(threadID)) {
        return message.reply("⚠️ نيم بلاك غير مفعّل في هذه المجموعة.");
      }
      activeLoops.delete(threadID);
      return message.reply("✅ تم إيقاف نيم بلاك.");
    }

    if (activeLoops.has(threadID)) {
      activeLoops.set(threadID, input);
      return message.reply(`✅ تم تحديث الاسم إلى: ${input}`);
    }

    activeLoops.set(threadID, input);
    message.reply(`✅ تم تفعيل نيم بلاك — الاسم: ${input}\n🔁 يتم تغييره كل ثانية.\n💡 لإيقافه: نيم بلاك off`);

    runLoop(api, threadID).catch(() => {});
  }
};
