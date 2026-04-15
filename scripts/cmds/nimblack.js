const activeLoops = new Map();

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runLoop(api, threadID) {
  let errorCount = 0;
  let totalFailures = 0;
  const MAX_ERRORS = 15;
  const MAX_TOTAL_FAILURES = 200;

  while (activeLoops.has(threadID)) {
    const currentName = activeLoops.get(threadID);
    try {
      await Promise.race([
        api.setTitle(currentName, threadID),
        new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), 10000))
      ]);
      errorCount = 0;
    } catch (err) {
      errorCount++;
      totalFailures++;

      if (totalFailures >= MAX_TOTAL_FAILURES) {
        activeLoops.delete(threadID);
        break;
      }

      if (errorCount >= MAX_ERRORS) {
        const delay = Math.min(60000, 3000 * errorCount);
        await sleep(delay);
        errorCount = Math.floor(MAX_ERRORS / 2);
      }
    }

    if (!activeLoops.has(threadID)) break;

    const waitTime = errorCount > 0
      ? Math.min(8000, 1000 + errorCount * 700)
      : 1000;
    await sleep(waitTime);
  }
}

module.exports = {
  config: {
    name: "نيم2",
    aliases: ["nimblack", "nim-black"],
    version: "3.0",
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
        "⚠️ اكتب الاسم الجديد بعد الأمر.\n💡 لإيقاف: .نيم2 off"
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
    message.reply(
      `✅ تم تفعيل نيم بلاك — الاسم: ${input}\n🔁 يتم تغييره كل ثانية.\n💡 لإيقافه: .نيم2 off`
    );

    runLoop(api, threadID).catch(() => {
      activeLoops.delete(threadID);
    });
  }
};
