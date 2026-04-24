const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const log = require("./logger/log.js");

const LOCK_FILE = path.join(__dirname, ".bot.lock");
function acquireSingletonLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const oldPid = parseInt(fs.readFileSync(LOCK_FILE, "utf-8").trim(), 10);
      if (oldPid && oldPid !== process.pid) {
        let alive = false;
        try { process.kill(oldPid, 0); alive = true; } catch (_) {}
        if (alive) {
          console.log(`[lock] another bot instance is running (pid ${oldPid}). Killing it before starting...`);
          try { process.kill(oldPid, "SIGKILL"); } catch (_) {}
          try {
            const childPids = execSync(`pgrep -P ${oldPid}`, { encoding: "utf-8" }).trim().split(/\s+/).filter(Boolean);
            for (const cpid of childPids) { try { process.kill(parseInt(cpid, 10), "SIGKILL"); } catch (_) {} }
          } catch (_) {}
          const start = Date.now();
          while (Date.now() - start < 5000) {
            try { process.kill(oldPid, 0); } catch { break; }
          }
        }
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid));
  } catch (e) {
    console.log("[lock] failed to acquire singleton lock:", e.message);
  }
}
function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const pid = parseInt(fs.readFileSync(LOCK_FILE, "utf-8").trim(), 10);
      if (pid === process.pid) fs.unlinkSync(LOCK_FILE);
    }
  } catch (_) {}
}
acquireSingletonLock();
process.on("exit", releaseLock);
process.on("SIGINT", () => { releaseLock(); process.exit(0); });
process.on("SIGTERM", () => { releaseLock(); process.exit(0); });

let restartCount = 0;
let lastRestartTime = 0;
const MAX_RAPID_RESTARTS = 5;
const RAPID_RESTART_WINDOW = 60000;
const BASE_RESTART_DELAY = 3000;
const MAX_RESTART_DELAY = 60000;

function getRestartDelay() {
        const now = Date.now();
        if (now - lastRestartTime > RAPID_RESTART_WINDOW) {
                restartCount = 0;
        }
        restartCount++;
        if (restartCount > MAX_RAPID_RESTARTS) {
                const delay = Math.min(MAX_RESTART_DELAY, BASE_RESTART_DELAY * Math.pow(2, restartCount - MAX_RAPID_RESTARTS));
                return delay;
        }
        return BASE_RESTART_DELAY;
}

function startProject() {
        lastRestartTime = Date.now();
        const child = spawn("node", ["--max-old-space-size=512", "--expose-gc", "Goat.js"], {
                cwd: __dirname,
                stdio: "inherit",
                shell: false,
                env: { ...process.env }
        });

        child.on("close", (code, signal) => {
                const reason = signal ? `signal ${signal}` : `exit code ${code}`;
                const isRequested = (code == 2);
                log.info(`Bot process ended (${reason}).${isRequested ? ' Requested restart.' : ' Unexpected exit.'}`);

                const delay = isRequested ? Math.max(2000, getRestartDelay()) : getRestartDelay();
                log.info(`Restarting in ${Math.round(delay / 1000)}s (restart #${restartCount})...`);
                setTimeout(() => {
                        startProject();
                }, delay);
        });

        child.on("error", (err) => {
                log.info(`Failed to start bot process: ${err.message}. Retrying in 5s...`);
                setTimeout(() => {
                        startProject();
                }, 5000);
        });
}

startProject();

setInterval(() => {
  if (typeof global.gc === "function") {
    try { global.gc(); } catch (_) {}
  }
  const used = process.memoryUsage();
  const mbHeap = Math.round(used.heapUsed / 1024 / 1024);
  if (mbHeap > 450) {
    console.log(`[MEM] Heap ${mbHeap}MB — high usage, triggering GC`);
    if (typeof global.gc === "function") try { global.gc(); } catch (_) {}
  }
}, 60000);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
        res.send('Bot is running!');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Uptime server running on port ${PORT}`);
});

server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
                console.log('Port 3000 already in use, skipping express server start.');
        } else {
                throw err;
        }
});
