import { app, BrowserWindow, dialog, ipcMain, Menu, Notification } from 'electron';
import { WindowManager } from './window-manager';
import { registerIpcHandlers } from './ipc-handlers';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';

let windowManager: WindowManager;

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
  autoUpdater.autoDownload = false;

  autoUpdater.on("update-available", () => {
    const result = dialog.showMessageBoxSync({
      type: "info",
      title: "Update Available",
      message: "A new version is available. Do you want to download it now?",
      buttons: ["Yes", "No"]
    });

    if (result === 0) {
      autoUpdater.downloadUpdate();
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
  
  windowManager.createWindow();

  initAutoUpdate();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow();
    }
  });
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