# Electron Deploy Tool

Modern GUI application for automating Git deployment workflows, built with Electron + TypeScript.

## Features

- ✅ **Multi-window Support**: Deploy multiple projects simultaneously (prevents concurrent deploys of same project)
- ✅ **Projects Management**: Add, edit, and delete projects with inline forms
- ✅ **Real-time Deploy Logs**: Stream git command output directly to UI
- ✅ **Deploy History**: View all past deployment logs
- ✅ **Dry-run Mode**: Test deployments without pushing to remote
- ✅ **System Notifications**: Get notified when deployments complete
- ✅ **Dark/Light Theme**: Toggle between themes with persistent preference
- ✅ **Cross-window Sync**: Configuration and deployment status synced across all windows

## Prerequisites

- Node.js 18+ 
- Git installed and configured
- Windows OS

## Installation

```bash
# Clone or create the project directory
mkdir electron-deploy-tool
cd electron-deploy-tool

# Install dependencies
npm install

# Create scripts.json with your projects
# See scripts.json example in the project

# Build TypeScript
npm run build

# Run in development
npm start

# Build for Windows
npm run dist
```

## Configuration

Edit `scripts.json` in the project root:

```json
{
  "projects": [
    {
      "name": "Auth",
      "repoPath": "C:\\Projects\\auth-service",
      "envs": ["dev", "staging", "prod"],
      "deployTypes": ["api", "webapp", "all"]
    }
  ]
}
```

## Usage

### Deploy Page
1. Select project from dropdown
2. Select branch (auto-loaded from git repo)
3. Select environment and deploy type
4. Check "Dry Run" to test without pushing
5. Click "Start Deploy"

### Projects Manager
- Add new projects with the "+ Add Project" button
- Edit existing projects inline
- Delete projects (with confirmation)

### History Viewer
- Browse all deployment log files by date
- Click any log file to view its contents

### Settings
- Toggle dark/light theme
- View log directory location

## Multi-window Behavior
- Open multiple deploy windows via **File > New Deploy Window** (Ctrl+N)
- Each window can deploy different projects simultaneously
- If Project A is being deployed in Window 1, Window 2 cannot deploy Project A
- Configuration changes sync across all windows instantly

## Development
```bash
# Watch TypeScript changes
npm run watch

# In another terminal, run the app
npm run start
```

## Build
```bash
# Build for Windows
npm run dist

# Output will be in release/ folder
```

## Project Structure
```
electron-deploy-tool/
├── src/
│   ├── main/              # Main process (Node.js)
│   │   ├── main.ts
│   │   ├── window-manager.ts
│   │   ├── deploy-service.ts
│   │   └── ipc-handlers.ts
│   ├── renderer/          # Renderer process (UI)
│   │   ├── index.html
│   │   ├── styles/
│   │   └── scripts/
│   └── preload/           # Preload script (IPC bridge)
│       └── preload.ts
├── assets/
│   └── icon.ico
├── extra/
│   └── scripts.json           # Project configuration
└── package.json
└── README.md
```

## Tech Stack
- **Electron** - Desktop application framework
- **TypeScript** - Type-safe JavaScript
- **HTML/CSS** - Modern UI with theme support
- **Node.js** - Git automation with child_process

## License
MIT

## Author
ThanhDC

---

**Note**: This tool executes git commands on your local repositories. Always ensure you have committed or stashed your work before deploying.