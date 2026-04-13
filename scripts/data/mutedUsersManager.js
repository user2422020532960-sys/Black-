const fs = require("fs-extra");
const path = require("path");

const MUTED_FILE = path.join(__dirname, "muted-users.json");
let _mutedUsers = null;

function load() {
    if (_mutedUsers) return _mutedUsers;
    let data = {};
    try {
        if (fs.existsSync(MUTED_FILE)) data = JSON.parse(fs.readFileSync(MUTED_FILE, "utf-8"));
    } catch (_) {}
    _mutedUsers = new Set(Object.keys(data).filter(k => data[k]));
    return _mutedUsers;
}

function save() {
    try {
        const muted = load();
        const obj = {};
        for (const id of muted) obj[id] = true;
        fs.ensureDirSync(path.dirname(MUTED_FILE));
        fs.writeFileSync(MUTED_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (_) {}
}

module.exports = {
    isMuted(userID) {
        return load().has(String(userID));
    },
    mute(userID) {
        load().add(String(userID));
        save();
    },
    unmute(userID) {
        load().delete(String(userID));
        save();
    }
};
