// Type declarations for renderer process
interface Window {
  api: {
    onUpdateDownloadStarted: (data: any) => void;
    onUpdateDownloadProgress: (data: any) => void;
    onUpdateDownloaded: (data: any) => void;
    onUpdateError: (data: any) => void;

    // Config operations
    loadConfig: () => Promise<any>;
    saveConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
    
    // Deploy operations
    canDeploy: (projectName: string) => Promise<boolean>;
    getActiveDeployments: () => Promise<string[]>;
    startDeploy: (options: any) => Promise<any>;
    
    // Log operations
    getLogDir: () => Promise<string>;
    getLogFiles: () => Promise<string[]>;
    readLogFile: (filename: string) => Promise<string>;
    
    // Git operations
    getBranches: (repoPath: string) => Promise<string[]>;
    
    // Notifications
    showNotification: (title: string, body: string) => void;
    
    // Event listeners
    onDeploymentStatusChanged: (callback: (activeProjects: string[]) => void) => void;
    onConfigUpdated: (callback: () => void) => void;
    onShowAbout: (callback: () => void) => void;

    // Dialog operations
    openDialogConfirm: (options: any) => Promise<boolean>;

    // File system
    openDirectoryDialog: () => Promise<string | null>;
  };
}
