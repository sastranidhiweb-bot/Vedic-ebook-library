# How to Package Your Electron App with Offline MongoDB

This guide will help you convert your Vedic Ebook Library web app into a fully offline desktop application (EXE) with MongoDB bundled for Windows users.

---

## 1. Download and Add MongoDB Binaries

1. Go to the [MongoDB Download Center](https://www.mongodb.com/try/download/community) and download the Windows ZIP version (not MSI installer).
2. Extract the ZIP and copy the entire `bin` folder (with `mongod.exe`, etc.) into your project root as `mongodb-bin`.
   
   Your structure should look like:
   ```
   D:/Angualr Live Project/Git/Vedic-ebook-library/mongodb-bin/mongod.exe
   ```

---

## 2. Add a Script to Start MongoDB from Electron

Create a file named `start-mongo.js` in your project root with this content:

```js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const mongoPath = path.join(__dirname, 'mongodb-bin', 'mongod.exe');
const dbPath = path.join(__dirname, 'mongo-data');

// Ensure dbPath exists
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath);
}

const mongod = spawn(mongoPath, ['--dbpath', dbPath, '--port', '27017'], {
  stdio: 'ignore',
  detached: true
});

mongod.unref();
console.log('MongoDB started on port 27017');
```

---

## 3. Modify Electron Main Process to Start MongoDB

At the top of your `main.js`, add:

```js
require('./start-mongo');
```

---

## 4. Update electron-builder Config in package.json

Add this to your `package.json`:

```json
"build": {
  "appId": "com.yourcompany.vedicebooklibrary",
  "productName": "Vedic Ebook Library",
  "files": [
    "**/*",
    "mongodb-bin/**/*"
  ],
  "win": {
    "target": "nsis"
  }
}
```

And add a build script:

```json
"scripts": {
  // ...existing scripts
  "dist": "electron-builder"
}
```

---

## 5. Install electron-builder

```
npm install --save-dev electron-builder
```

---

## 6. Build Your EXE

```
npm run dist
```

Your distributable EXE will be in the `dist/` folder.

---

## 7. Backend MongoDB Connection

Make sure your backend connects to:
```
mongodb://localhost:27017/your-db-name
```

---

**You can now distribute your EXE to users, and MongoDB will run locally with your app, fully offline!**
