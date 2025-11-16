import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export interface DeployOptions {
  project: string;
  branch: string;
  env: string;
  type: string;
  repoPath: string;
  dryRun: boolean;
  isAutomatic?: boolean; // Flag for auto-deploy
}

export interface DeployResult {
  success: boolean;
  logs: string[];
  error?: string;
}

export class DeployService {
  private readonly cicdFileName = 'CICD.txt';
  private readonly userDataPath = app.getPath('userData');
  private readonly logDir = path.join(this.userDataPath, 'logs');

  constructor() {
    fs.mkdirSync(this.logDir, { recursive: true });
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `deploy-${date}.log`);
  }

  private log(msg: string, logs: string[]): void {
    const time = new Date().toISOString();
    const line = `[${time}] ${msg}`;
    logs.push(line);
    
    // Also write to file
    try {
      fs.appendFileSync(this.getLogFilePath(), line + '\n');
    } catch (err) {
      console.error('Failed to write log:', err);
    }
  }

  private runCommand(cmd: string, cwd: string, logs: string[]): boolean {
    try {
      this.log(`$ ${cmd}`, logs);
      const output = execSync(cmd, { 
        cwd, 
        stdio: 'pipe',
        encoding: 'utf8'
      }).toString().trim();
      
      if (output) {
        this.log(output, logs);
      }
      return true;
    } catch (err: any) {
      this.log(`❌ Error running: ${cmd}`, logs);
      const errorMsg = err.stderr?.toString() || err.message;
      this.log(errorMsg, logs);
      return false;
    }
  }

  private getCommitMsg(env: string, type: string): string {
    const commitPostfix = (type === 'all') ?  '' : `, ${type}`;
    return `deploy: ${env}${commitPostfix}`;
  }

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const logs: string[] = [];
    const { project, branch, env, type, repoPath, dryRun } = options;

    try {
      this.log(`🚀 Starting deploy for ${project} (${env}) [${type}]`, logs);
      this.log(`Repo path: ${repoPath}`, logs);
      this.log(`Branch: ${branch}`, logs);
      
      if (dryRun) {
        this.log('⚠️  Running in DRY-RUN mode (will not push to remote)', logs);
      }

      // Check if repo path exists
      if (!fs.existsSync(repoPath)) {
        throw new Error(`Repository path does not exist: ${repoPath}`);
      }

      // Git operations
      if (!this.runCommand('git stash', repoPath, logs)) {
        throw new Error('Git stash failed');
      }

      if (!this.runCommand('git fetch', repoPath, logs)) {
        throw new Error('Git fetch failed');
      }

      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath, encoding: 'utf8' }).toString().trim();
      if (currentBranch == branch) {
        this.log(`Current branch: ${currentBranch}`, logs);
      } else if (!this.runCommand(`git checkout ${branch}`, repoPath, logs)) {
        throw new Error('Git checkout failed');
      }

      if (!this.runCommand('git pull', repoPath, logs)) {
        throw new Error('Git pull failed');
      }

      // Update CICD.txt
      const commitMsg = this.getCommitMsg(env, type);
      this.updateCICDFile(repoPath, commitMsg);
      this.log(`✓ Added to ${this.cicdFileName}: ${commitMsg}`, logs);

      // Commit
      if (!this.runCommand(`git add ${this.cicdFileName}`, repoPath, logs)) {
        throw new Error('Git add failed');
      }

      if (!this.runCommand(`git commit -m "${commitMsg}"`, repoPath, logs)) {
        throw new Error('Git commit failed');
      }

      // Push (if not dry-run)
      if (dryRun) {
        this.log('DRY-RUN: Skipping push step', logs);
        this.log('✅ SUCCESS: Dry-run completed (no push)', logs);
      } else {
        if (!this.runCommand('git push', repoPath, logs)) {
          throw new Error('Git push failed');
        }
        this.log('✅ SUCCESS: Deploy completed!', logs);
      }

      return { success: true, logs };
    } catch (err: any) {
      this.log(`❌ Deploy failed: ${err.message}`, logs);
      return { success: false, logs, error: err.message };
    } finally {
      this.log('', logs);
    }
  }

  updateCICDFile(repoPath: string, commitMsg: string) {
    const cicdPath = path.join(repoPath, this.cicdFileName);
    if (!fs.existsSync(cicdPath)) {
      throw new Error(`${this.cicdFileName} does not exist in repo`);
    }
    const content = fs.readFileSync(cicdPath, 'utf8');
    const lines = content.split(/\r?\n/);

    // File empty
    if (lines.length === 1 && lines[0] === '') {
      fs.writeFileSync(cicdPath, commitMsg);
    } else {
      const lastLine = lines.at(-1) as string;
      if (lastLine.trim() === '') {
        // Nếu dòng cuối là dòng trống → thêm ngay phía trên dòng trống đó
        lines.splice(-1, 0, commitMsg);
      } else {
        // Nếu dòng cuối có nội dung → thêm dòng mới ở cuối file
        lines.push(commitMsg);
      }
      fs.writeFileSync(cicdPath, lines.join('\n'));
    }
  }

  getLogDir(): string {
    return this.logDir;
  }

  getLogFiles(): string[] {
    try {
      const files = fs.readdirSync(this.logDir);
      return files
        .filter(f => f.startsWith('deploy-') && f.endsWith('.log'))
        .sort()
        .reverse();
    } catch (err) {
      return [];
    }
  }

  readLogFile(filename: string): string {
    try {
      const filePath = path.join(this.logDir, filename);
      return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      return `Error reading log file: ${err}`;
    }
  }
}