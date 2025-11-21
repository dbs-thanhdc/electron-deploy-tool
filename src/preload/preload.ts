import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // ===== Auto Update APIs =====
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Auto update event listeners
  onUpdateDownloadStarted: (callback: (data: any) => void) => {
    ipcRenderer.on('update-download-started', (_event, data) => callback(data));
  },
  onUpdateDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('update-download-progress', (_event, data) => callback(data));
  },
  onUpdateDownloaded: (callback: (data: any) => void) => {
    ipcRenderer.on('update-downloaded', (_event, data) => callback(data));
  },
  onUpdateError: (callback: (data: any) => void) => {
    ipcRenderer.on('update-error', (_event, data) => callback(data));
  },

  // Config operations
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  
  // Deploy operations
  canDeploy: (projectName: string) => ipcRenderer.invoke('can-deploy', projectName),
  getActiveDeployments: () => ipcRenderer.invoke('get-active-deployments'),
  startDeploy: (options: any) => ipcRenderer.invoke('start-deploy', options),
  
  // Log operations
  getLogDir: () => ipcRenderer.invoke('get-log-dir'),
  getLogFiles: () => ipcRenderer.invoke('get-log-files'),
  readLogFile: (filename: string) => ipcRenderer.invoke('read-log-file', filename),
  
  // Git operations
  getBranches: (repoPath: string) => ipcRenderer.invoke('get-branches', repoPath),

  // Notifications
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  
  // Event listeners
  onDeploymentStatusChanged: (callback: (activeProjects: string[]) => void) => {
    ipcRenderer.on('deployment-status-changed', (event, activeProjects) => {
      callback(activeProjects);
    });
  },
  
  onConfigUpdated: (callback: () => void) => {
    ipcRenderer.on('config-updated', () => {
      callback();
    });
  },
  
  onShowAbout: (callback: () => void) => {
    ipcRenderer.on('show-about', () => {
      callback();
    });
  },

  // Dialog operations
  openDialogConfirm: (options: any) => ipcRenderer.invoke('open-dialog-confirm', options),

  // File system
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
});