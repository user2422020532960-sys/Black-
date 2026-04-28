const _restoreTimers = new Map();
const _retryTimers = new Map();
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY = 3000;

async function buildNickname(text, uid, usersData) {
  let name = text;
  if (/\{userName\}/gi.test(name)) {
    const uname = await usersData.getName(uid).catch(() => uid);
    name = name.replace(/\{userName\}/gi, uname);
  }
  if (/\{userID\}/gi.test(name)) name = name.replace(/\{userID\}/gi, uid);
  return name;
}

async function restoreWithRetry(api, nickname, threadID, uid, attempt = 0) {
  const retryKey = `${threadID}:${uid}:retry`;
  try {
    await api.changeNickname(nickname, threadID, uid);
    _retryTimers.delete(retryKey);
  } catch (_) {
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
      const t = setTimeout(() => {
        _retryTimers.delete(retryKey);
        restoreWithRetry(api, nickname, threadID, uid, attempt + 1);
      }, delay);
      _retryTimers.set(retryKey, t);
    }
  }
}

module.exports = {
  config: {
    name: "ضع",
    aliases: ["da3"],
    version: "3.2",
    author: "Saint",
    countDown: 5,
    role: 0,
    shortDescription: "ضع كنية لكل أعضاء المجموعة مع حماية",
    category: "box chat",
    guide: "{pn} [النص] | {pn} off"
  },

  onStart: async function ({ args, event, api, usersData, threadsData, message }) {
    const { threadID } = event;
    const text = args.join(" ").trim();
    if (!text) return;

    const botID = String(api.getCurrentUserID());

    if (text === "off") {
      await threadsData.set(threadID, {}, "data.da3Lock");
      return message.reply("◈ تم إيقاف قفل الكنيات");
    }

    const threadInfo = await api.getThreadInfo(threadID);
    const targets = threadInfo.participantIDs.filter(uid => String(uid) !== botID);

    if (!targets.length) return message.reply("◈ لا يوجد أعضاء لتغيير كنياتهم");

    const nicknames = {};
    const BATCH = 4;
    const DELAY_BETWEEN = 900;
    let done = 0;
    let failed = 0;

    for (let i = 0; i < targets.length; i += BATCH) {
      const batch = targets.slice(i, i + BATCH);
      await Promise.all(batch.map(async (uid) => {
        try {
          const name = await buildNickname(text, uid, usersData);
          await api.changeNickname(name, threadID, String(uid));
          nicknames[String(uid)] = name;
          done++;
        } catch (e) { failed++; }
      }));
      if (i + BATCH < targets.length) await new Promise(r => setTimeout(r, DELAY_BETWEEN));
    }

    await threadsData.set(threadID, { enable: true, nickname: text, nicknames }, "data.da3Lock");
    message.reply(`◈ تم تغيير ${done}/${targets.length} كنية بنجاح${failed ? ` (${failed} فشل)` : ""}`);
  },

  onEvent: async function ({ api, event, threadsData, usersData }) {
    const { threadID, author, logMessageType, logMessageData } = event;
    if (logMessageType !== "log:user-nickname") return;

    const lock = await threadsData.get(threadID, "data.da3Lock");
    if (!lock?.enable) return;

    const botID = String(api.getCurrentUserID());
    if (String(author) === botID) return;

    const participant_id = String(logMessageData?.participant_id || "");
    if (!participant_id) return;

    let restoreNickname = lock.nicknames?.[participant_id];
    if (restoreNickname === undefined) {
      restoreNickname = await buildNickname(lock.nickname || "", participant_id, usersData);
    }

    const key = `${threadID}:${participant_id}`;
    const retryKey = `${key}:retry`;

    if (_restoreTimers.has(key)) clearTimeout(_restoreTimers.get(key));
    if (_retryTimers.has(retryKey)) {
      clearTimeout(_retryTimers.get(retryKey));
      _retryTimers.delete(retryKey);
    }

    const timer = setTimeout(async () => {
      _restoreTimers.delete(key);
      await restoreWithRetry(api, restoreNickname, threadID, participant_id);
    }, 1000);

    _restoreTimers.set(key, timer);
  }
};
