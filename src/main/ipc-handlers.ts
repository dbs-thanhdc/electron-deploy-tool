import { app, ipcMain, BrowserWindow, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { WindowManager } from './window-manager';
import { DeployService, DeployOptions } from './deploy-service';
import { ConfigI } from './interface';
import { autoUpdater } from 'electron-updater';

const deployService = new DeployService();
const userDataPath = app.getPath('userData');

const configDefault = {
  "projects": [
    {
      "name": "Project Name",
      "repoPath": "Repository Path",
      "envs": [
        "dev",
      ],
      "deployTypes": [
        "api",
        "webapp",
        "all"
      ]
    }
  ]
};

function getExtraFilePath(filename: string): string {
  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, "extra")
    : path.join(process.cwd(), "extra");

  const filePath = path.join(basePath, filename);

  if (!fs.existsSync(filePath)) {
    console.warn("[WARN] Extra file not found:", filePath);
  }

  return filePath;
}

function getScriptsPath(): string {
  return path.join(userDataPath, 'scripts.json');
}

export function registerIpcHandlers(windowManager: WindowManager) {
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  // Load configuration
  ipcMain.handle('load-config', async () => {
    try {
      const scriptsPath = getScriptsPath();
      if (!fs.existsSync(scriptsPath)) {
        const scriptsSamplePath = getExtraFilePath('scripts.json');
        if (fs.existsSync(scriptsSamplePath)) {
          const configSample = fs.readFileSync(scriptsSamplePath, 'utf8');
          fs.writeFileSync(scriptsPath, configSample);
          console.log('Sample scripts.json copied to user data directory', scriptsSamplePath);
          return scriptsPath;
        } else {
          console.warn('Sample scripts.json not found, using default config');
        }
        fs.writeFileSync(scriptsPath, JSON.stringify(configDefault, null, 2), 'utf8');
        return configDefault;
      }
      const config = fs.readFileSync(scriptsPath, 'utf8');
      const scripts: ConfigI = JSON.parse(config);
      scripts.projects = (scripts.projects || [])
        .map((project) => {
          if (!project.branchFilter) project.branchFilter = '';
          if (!project.commitFormat) project.commitFormat = 'v1';
          if (!project.commitTemplate) project.commitTemplate = 'deploy: {env}, {type}';
          if (!project.fileContentFormat) project.fileContentFormat = 'default';
          if (!project.fileContentTemplate) project.fileContentTemplate = project.commitTemplate;
          return project;
        });
      return scripts;
    } catch (err: any) {
      console.error('Error loading config:', err);
      return { error: err.message };
    }
  });

  // Save configuration
  ipcMain.handle('save-config', async (event, config) => {
    try {
      const scriptsPath = getScriptsPath();
      fs.writeFileSync(scriptsPath, JSON.stringify(config, null, 2), 'utf8');
      windowManager.broadcastConfigUpdate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Check if can deploy
  ipcMain.handle('can-deploy', async (event, projectName: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    return windowManager.canDeploy(projectName, win.id);
  });

  // Get active deployments
  ipcMain.handle('get-active-deployments', async () => {
    return windowManager.getActiveDeployments();
  });

  // Start deployment
  ipcMain.handle('start-deploy', async (event, options: DeployOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      return { success: false, error: 'Window not found' };
    }

    if (!windowManager.canDeploy(options.project.name, win.id)) {
      return { 
        success: false, 
        error: `Project ${options.project.name} is already being deployed in another window` 
      };
    }

    windowManager.setDeploymentActive(options.project.name, win.id);
    
    try {
      const result = await deployService.deploy(options);
      return result;
    } finally {
      windowManager.setDeploymentInactive(options.project.name);
    }
  });

  // Get log directory
  ipcMain.handle('get-log-dir', async () => {
    return deployService.getLogDir();
  });

  // Get log files
  ipcMain.handle('get-log-files', async () => {
    return deployService.getLogFiles();
  });

  // Read log file
  ipcMain.handle('read-log-file', async (event, filename: string) => {
    return deployService.readLogFile(filename);
  });

  // Get branches from git repo
  ipcMain.handle('get-branches', async (event, repoPath: string) => {
    try {
      const { execSync } = require('child_process');

      // Fetch latest branches
      execSync('git fetch --prune', { cwd: repoPath });

      // Get the list of remote branches
      const output: string = execSync('git branch -r', { 
        cwd: repoPath, 
        encoding: 'utf8' 
      });

      // Parse branches
      const branches = output
        .split('\n')
        .map(b => b.trim().replace('origin/', ''))
        .filter(b => b && !b.includes('->'))
        .sort();
      
      return branches;
    } catch (err: any) {
      console.error('Error getting branches:', err);
      return [];
    }
  });

  ipcMain.handle('open-dialog-confirm', async (event, options: any) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    const result = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Cancel', 'OK'],
      title: options.title,
      message: options.message,
      detail: options.detail || '',
    });

    return result.response === 1; // OK button was pressed
  });

  ipcMain.handle('open-directory-dialog', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select Repository Folder'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
}