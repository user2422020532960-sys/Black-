const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handlerCheckData.js");

const MAX_BODY_LENGTH = 8000;
const _FLOOD_THRESHOLD = 8;
const QUEUE_CONCURRENCY = 3;

const _threadMsgCount = new Map();
const _processingQueues = new Map();
let _activeWorkers = 0;

function isThreadFlooding(threadID) {
  const now = Math.floor(Date.now() / 1000);
  const key = `${threadID}:${now}`;
  const count = (_threadMsgCount.get(key) || 0) + 1;
  _threadMsgCount.set(key, count);
  if (_threadMsgCount.size > 300) {
    for (const [k] of _threadMsgCount) {
      if (!k.endsWith(`:${now}`) && !k.endsWith(`:${now - 1}`))
        _threadMsgCount.delete(k);
    }
  }
  return count > _FLOOD_THRESHOLD;
}

function enqueueForThread(threadID, task) {
  if (!_processingQueues.has(threadID))
    _processingQueues.set(threadID, []);
  const queue = _processingQueues.get(threadID);
  if (queue.length >= 10) return;
  queue.push(task);
  if (_activeWorkers < QUEUE_CONCURRENCY)
    drainQueue(threadID);
}

async function drainQueue(threadID) {
  const queue = _processingQueues.get(threadID);
  if (!queue || queue.length === 0) {
    _processingQueues.delete(threadID);
    return;
  }
  _activeWorkers++;
  const task = queue.shift();
  try {
    await Promise.race([
      task(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("TASK_TIMEOUT")), 25000))
    ]);
  } catch (err) {
    if (err.message !== "TASK_TIMEOUT")
      console.error("[QUEUE_ERROR]", err?.message || err);
  } finally {
    _activeWorkers--;
    if ((queue?.length || 0) > 0)
      drainQueue(threadID).catch(() => {});
    else
      _processingQueues.delete(threadID);
  }
}

setInterval(() => {
  for (const [id, q] of _processingQueues) {
    if (!q || q.length === 0) _processingQueues.delete(id);
  }
  if (typeof global.gc === "function") {
    try { global.gc(); } catch (_) {}
  }
}, 120000);

module.exports = (
  api,
  threadModel,
  userModel,
  dashBoardModel,
  globalModel,
  usersData,
  threadsData,
  dashBoardData,
  globalData
) => {
  const handlerEvents = require(
    process.env.NODE_ENV == "development"
      ? "./handlerEvents.dev.js"
      : "./handlerEvents.js"
  )(
    api,
    threadModel,
    userModel,
    dashBoardModel,
    globalModel,
    usersData,
    threadsData,
    dashBoardData,
    globalData
  );

  return async function (event) {
    if (
      global.BlackBot.config.antiInbox == true &&
      (event.senderID == event.threadID ||
        event.userID == event.senderID ||
        event.isGroup == false) &&
      (event.senderID || event.userID || event.isGroup == false)
    )
      return;

    if (event.type === "typ" || event.type === "presence" || event.type === "read_receipt")
      return;

    const isMessage = event.type === "message" || event.type === "message_reply";
    let _onChatOnly = false;

    if (isMessage) {
      const body = (event.body || "");
      if (body.length > MAX_BODY_LENGTH) {
        event.body = body.slice(0, MAX_BODY_LENGTH);
      }

      const prefix = (global.utils.getPrefix && global.utils.getPrefix(event.threadID)) || global.BlackBot?.config?.prefix || ".";
      const trimmedBody = event.body.trim();
      const isCommand = trimmedBody.startsWith(prefix);
      const isAiTrigger = trimmedBody.startsWith("بلاك");
      const hasOnReply = event.messageReply && global.BlackBot.onReply.has(event.messageReply.messageID);
      const isAdminDM = !event.isGroup && (global.BlackBot.config.adminBot || []).includes(event.senderID);
      const hasOnChatHandlers = Array.isArray(global.BlackBot.onChat) && global.BlackBot.onChat.length > 0;

      if (!isCommand && !isAiTrigger && !hasOnReply && !isAdminDM) {
        if (!hasOnChatHandlers) return;
        _onChatOnly = true;
      }

      if (isCommand && isThreadFlooding(event.threadID))
        return;
    }
    event._onChatOnly = _onChatOnly;

    const threadID = event.threadID || "global";

    enqueueForThread(threadID, async () => {
      const message = createFuncMessage(api, event);
      await handlerCheckDB(usersData, threadsData, event);

      const handlerChat = await handlerEvents(event, message);
      if (!handlerChat) return;

      const {
        onAnyEvent,
        onFirstChat,
        onStart,
        onChat,
        onReply,
        onEvent,
        handlerEvent,
        onReaction
      } = handlerChat;

      switch (event.type) {
        case "message":
        case "message_reply":
        case "message_unsend":
          if (event._onChatOnly) {
            await safeRun(onChat);
          } else {
            await safeRun(onStart);
            await safeRun(onChat);
            await safeRun(onReply);
          }
          break;

        case "event":
          await safeRun(handlerEvent);
          await safeRun(onEvent);
          break;

        case "message_reaction":
          await safeRun(onReaction);
          try {
            const cfg = global.BlackBot.config.reactUnsend || {};
            const adminIDs = global.BlackBot.config.adminBot || [];
            const isAdmin = adminIDs.includes(event.userID || event.senderID);
            if (cfg.enable && cfg.emojis?.includes(event.reaction) && (!cfg.onlyAdmin || isAdmin))
              await api.unsendMessage(event.messageID);
          } catch (err) {
            console.error("[React-Unsend]", err?.message);
          }
          break;

        default:
          break;
      }
    });
  };
};

async function safeRun(fn) {
  if (typeof fn !== "function") return;
  try {
    await fn();
  } catch (err) {
    if (err?.message !== "TASK_TIMEOUT")
      console.error("[SAFE_RUN]", err?.message || err);
  }
}
