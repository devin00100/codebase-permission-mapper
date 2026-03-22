/// <reference types="vite/client" />

// Electron API types exposed via preload script
interface ElectronAPI {
  selectDirectory: () => Promise<{ success: boolean; canceled?: boolean; path?: string }>;
  selectDatabase: () => Promise<{ success: boolean; canceled?: boolean; path?: string }>;
  runScan: (sourceDir: string, configPath?: string) => Promise<any>;
  runMap: (configPath?: string, scanResultsPath?: string) => Promise<any>;
  runFullAnalysis: (sourceDir: string, configPath?: string) => Promise<any>;
  loadPermissionMap: () => Promise<{ success: boolean; data?: any; error?: string }>;
  loadAuditReport: () => Promise<{ success: boolean; data?: any; error?: string }>;
  loadScanResults: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getArtifactsPath: () => Promise<string>;
  exportData: (data: any, filename?: string) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  exportMarkdown: (markdown: string) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  readConfig: () => Promise<{ success: boolean; config?: any; configPath?: string; error?: string }>;
  updateConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  updateDbPath: (newPath: string) => Promise<{ success: boolean; error?: string }>;
  onAnalysisProgress: (callback: (data: { phase: string; progress: number }) => void) => void;
  onMenuSelectDirectory: (callback: () => void) => void;
  onMenuExportResults: (callback: () => void) => void;
  onMenuRunScan: (callback: () => void) => void;
  onMenuBuildMap: (callback: () => void) => void;
  onMenuClearResults: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
