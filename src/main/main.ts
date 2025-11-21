import { app, BrowserWindow, dialog, ipcMain, Menu, Notification } from 'electron';
import { WindowManager } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';

let windowManager: WindowManager;
let mainWindow: BrowserWindow | null = null;

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Deploy Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            windowManager.createWindow();
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    // TODO: Add Help menu later
    // {
    //   label: 'Help',
    //   submenu: [
    //     {
    //       label: 'About',
    //       click: () => {
    //         const win = BrowserWindow.getFocusedWindow();
    //         if (win) {
    //           win.webContents.send('show-about');
    //         }
    //       }
    //     }
    //   ]
    // }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function initAutoUpdate() {
  autoUpdater.logger = require("electron-log")
  autoUpdater.autoDownload = false;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("Update not available:", info);
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info);

    dialog.showMessageBox({
      type: "info",
      title: "Update Available",
      message: "A new version is available. Do you want to download it now?",
      buttons: ["Yes", "No"],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        console.log("User chose to download update");
        autoUpdater.downloadUpdate();

        dialog.showMessageBox({
          type: "info",
          title: "Downloading Update",
          message: "Downloading the update. Please wait...",
          buttons: ["OK"]
        });
      }
    }).catch(err => {
      console.error("Error showing update dialog:", err);
    });
  });

  autoUpdater.on("download-progress", (progressObj) => {
    // Tính toán các thông số
    const percent = progressObj.percent.toFixed(2);
    const downloadedMB = (progressObj.transferred / 1024 / 1024).toFixed(2);
    const totalMB = (progressObj.total / 1024 / 1024).toFixed(2);
    const speedMBps = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2);
    
    // Log chi tiết ra console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📥 Đang tải xuống cập nhật: ${percent}%`);
    console.log(`📊 Tiến trình: ${downloadedMB}MB / ${totalMB}MB`);
    console.log(`⚡ Tốc độ: ${speedMBps} MB/s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Hiển thị progress bar trên taskbar
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(progressObj.percent / 100);
      mainWindow.setTitle(`Đang tải cập nhật... ${percent}%`);
      
      // Gửi tiến trình tới renderer process
      mainWindow.webContents.send('update-download-progress', {
        percent: parseFloat(percent),
        downloadedMB: parseFloat(downloadedMB),
        totalMB: parseFloat(totalMB),
        speedMBps: parseFloat(speedMBps),
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on("update-downloaded", () => {
    const result = dialog.showMessageBoxSync({
      type: "question",
      title: "Install Update",
      message: "Update downloaded. Install and restart now?",
      buttons: ["Yes", "Later"]
    });

    if (result === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto update error:", error);
  });

  autoUpdater.checkForUpdates();
}

app.whenReady().then(() => {
  windowManager = new WindowManager();
  registerIpcHandlers(windowManager);
  createMenu();
  
  mainWindow = windowManager.createWindow();

  initAutoUpdate();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow();
    }
  });

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle notifications
ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const iconPath = path.join(__dirname, '../../assets/icon.ico');
    const notification = new Notification({ title, body, icon: iconPath });
    notification.show();
  }
});