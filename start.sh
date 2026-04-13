#!/bin/bash
node -e "try{require('sqlite3');console.log('sqlite3 OK')}catch(e){console.log('Building sqlite3...');require('child_process').execSync('cd node_modules/sqlite3 && node-gyp configure && node-gyp build',{stdio:'inherit'});console.log('sqlite3 built!')}"
node index.js
