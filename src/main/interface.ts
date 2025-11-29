export interface ProjectI {
  name: string;
  repoPath: string;
  envs: string[];
  deployTypes: string[];
  branchFilter: string;
  commitFormat: string;
  commitTemplate: string;
  fileContentFormat: string;
  fileContentTemplate: string;
  smartAppend: boolean;
}
export interface ConfigI {
  projects: ProjectI[];
}
