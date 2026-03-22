/**
 * Preload Script - Secure Bridge Between Main and Renderer
 * Exposes safe APIs to the renderer process via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================
  // Directory & File Selection
  // ============================================
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectDatabase: () => ipcRenderer.invoke('select-database'),
  
  // ============================================
  // Scanner Operations
  // ============================================
  runScan: (sourceDir, configPath) => ipcRenderer.invoke('run-scan', sourceDir, configPath),
  runMap: (configPath, scanResultsPath) => ipcRenderer.invoke('run-map', configPath, scanResultsPath),
  runFullAnalysis: (sourceDir, configPath) => ipcRenderer.invoke('run-full-analysis', sourceDir, configPath),
  
  // ============================================
  // Data Loading
  // ============================================
  loadPermissionMap: () => ipcRenderer.invoke('load-permission-map'),
  loadAuditReport: () => ipcRenderer.invoke('load-audit-report'),
  loadScanResults: () => ipcRenderer.invoke('load-scan-results'),
  getArtifactsPath: () => ipcRenderer.invoke('get-artifacts-path'),
  
  // ============================================
  // Export Functions
  // ============================================
  exportData: (data, filename) => ipcRenderer.invoke('export-data', data, filename),
  exportMarkdown: (markdown) => ipcRenderer.invoke('export-markdown', markdown),
  
  // ============================================
  // Configuration
  // ============================================
  readConfig: () => ipcRenderer.invoke('read-config'),
  updateConfig: (config) => ipcRenderer.invoke('update-config', config),
  updateDbPath: (newPath) => ipcRenderer.invoke('update-db-path', newPath),
  
  // ============================================
  // Event Listeners
  // ============================================
  onAnalysisProgress: (callback) => {
    ipcRenderer.on('analysis-progress', (event, data) => callback(data));
  },
  
  onMenuSelectDirectory: (callback) => {
    ipcRenderer.on('menu-select-directory', () => callback());
  },
  
  onMenuExportResults: (callback) => {
    ipcRenderer.on('menu-export-results', () => callback());
  },
  
  onMenuRunScan: (callback) => {
    ipcRenderer.on('menu-run-scan', () => callback());
  },
  
  onMenuBuildMap: (callback) => {
    ipcRenderer.on('menu-build-map', () => callback());
  },
  
  onMenuClearResults: (callback) => {
    ipcRenderer.on('menu-clear-results', () => callback());
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Log that preload script is ready
console.log('Preload script loaded successfully');
