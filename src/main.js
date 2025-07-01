const path = require('node:path');
const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');


// Windows shortcut handling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// File picker for videos
ipcMain.handle('select-video-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov'] }]
  });

  return canceled || filePaths.length === 0 ? null : filePaths[0];
});

// 🪟 Create the browser window
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      webSecurity: false, // needed for file:// video playback
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

// ✅ Wait for Electron to be ready
app.whenReady().then(() => {
  // 🛡️ Set CSP to allow file:// media loading
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; media-src 'self' file: data: blob:;"
        ],
      },
    });
  });


  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit on close (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
