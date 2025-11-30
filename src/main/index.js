const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const DB = require('./db');
const Worker = require('./worker');

let mainWindow;
let db;
let worker;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/index.html');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  db = DB.init(path.join(app.getPath('userData'), 'shorts_data.sqlite'));
  worker = new Worker(db);

  createWindow();

  ipcMain.handle('get-status', async () => ({ ready: true }));

  ipcMain.handle('set-api-key', async (event, key) => {
    db.setSetting('youtube_api_key', key);
    return { ok: true };
  });

  ipcMain.handle('get-api-key', async () => {
    return db.getSetting('youtube_api_key') || '';
  });

  ipcMain.handle('seed-search', async (event, query, max_results) => {
    try {
      await worker.enqueueSearch(query, max_results || 20);
      return { enqueued: true };
    } catch (e) {
      return { error: String(e) };
    }
  });

  ipcMain.handle('get-top-shorts', async (event, limit) => {
    return db.getTopShorts(limit || 50);
  });

  ipcMain.handle('get-video-metrics', async (event, videoId) => {
    return db.getVideoMetrics(videoId);
  });

  ipcMain.handle('export-csv', async (event, kind) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${kind}.csv`
    });
    if (!filePath) return { canceled: true };
    const csv = db.exportCSV(kind);
    const fs = require('fs');
    fs.writeFileSync(filePath, csv, 'utf8');
    return { ok: true, path: filePath };
  });

  worker.startSchedule();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
