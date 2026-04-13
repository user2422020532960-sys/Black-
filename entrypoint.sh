#!/bin/sh
node -e '
var fs = require("fs");
var val = process.env.APPSTATE;
if (val) {
  fs.writeFileSync("/app/account.txt", val);
  console.log("✅ account.txt created from APPSTATE");
} else if (!fs.existsSync("/app/account.txt")) {
  console.error("❌ ERROR: APPSTATE not set and account.txt not found!");
  process.exit(1);
} else {
  console.log("✅ account.txt already exists");
}
'
exec node index.js
