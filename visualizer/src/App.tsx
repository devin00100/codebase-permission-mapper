import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/dashboard/Header';
import { SummaryCards, QuickStats } from '@/components/dashboard/SummaryCards';
import { MatrixView } from '@/components/dashboard/MatrixView';
import { EndpointAnalyzer } from '@/components/dashboard/EndpointAnalyzer';
import { AuditTool } from '@/components/dashboard/AuditTool';
import { RolesView } from '@/components/dashboard/RolesView';
import { PermissionsView } from '@/components/dashboard/PermissionsView';
import type { ViewMode, PermissionMap, AuditReport } from '@/types';
import { toast } from 'sonner';
import './App.css';

// Electron API interface
interface ElectronAPI {
  selectDirectory: () => Promise<{ success: boolean; canceled?: boolean; path?: string }>;
  selectDatabase: () => Promise<{ success: boolean; canceled?: boolean; path?: string }>;
  runFullAnalysis: (sourceDir: string) => Promise<{ success: boolean; permissionMap?: PermissionMap; error?: string }>;
  loadPermissionMap: () => Promise<{ success: boolean; data?: PermissionMap; error?: string }>;
  loadAuditReport: () => Promise<{ success: boolean; data?: AuditReport; error?: string }>;
  exportData: (data: any, filename?: string) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  onAnalysisProgress: (callback: (data: { phase: string; progress: number }) => void) => void;
  onMenuSelectDirectory: (callback: () => void) => void;
  onMenuRunScan: (callback: () => void) => void;
  onMenuExportResults: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('matrix');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [data, setData] = useState<PermissionMap | null>(null);
  const [auditData, setAuditData] = useState<AuditReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ phase: '', progress: 0 });
  const [sourceDir, setSourceDir] = useState('');
  const [dbPath, setDbPath] = useState('');

  const isElectron = !!window.electronAPI;

  // Setup listeners on mount
  useEffect(() => {
    if (isElectron) {
      setupListeners();
    }
  }, []);

  const loadExistingData = async () => {
    try {
      const [mapResult, reportResult] = await Promise.all([
        window.electronAPI!.loadPermissionMap(),
        window.electronAPI!.loadAuditReport()
      ]);
      
      if (mapResult.success && mapResult.data) {
        setData(mapResult.data);
      }
      if (reportResult.success && reportResult.data) {
        setAuditData(reportResult.data);
      }
    } catch (err) {
      console.error('Failed to load existing data:', err);
    }
  };

  const setupListeners = () => {
    window.electronAPI?.onAnalysisProgress((progressData) => {
      setScanProgress(progressData);
      if (progressData.phase === 'complete') {
        setIsScanning(false);
        loadExistingData();
        toast.success('Analysis complete!');
      }
    });

    window.electronAPI?.onMenuSelectDirectory(handleSelectDirectory);
    window.electronAPI?.onMenuRunScan(() => sourceDir && handleRunAnalysis());
    window.electronAPI?.onMenuExportResults(handleExport);
  };

  const handleSelectDirectory = useCallback(async () => {
    if (!isElectron) return;
    
    const result = await window.electronAPI!.selectDirectory();
    if (result.success && result.path) {
      setSourceDir(result.path);
      toast.info('Source directory selected', {
        description: result.path.split(/[/\\]/).pop()
      });
    }
  }, [isElectron]);

  const handleSelectDatabase = useCallback(async () => {
    if (!isElectron) return;
    
    const result = await window.electronAPI!.selectDatabase();
    if (result.success && result.path) {
      setDbPath(result.path);
      toast.info('Database path updated');
    }
  }, [isElectron]);

  const handleRunAnalysis = useCallback(async () => {
    if (!isElectron) return;
    if (!sourceDir) {
      toast.error('Please select a source directory first');
      return;
    }

    setIsScanning(true);
    setScanProgress({ phase: 'scanning', progress: 0 });

    try {
      const result = await window.electronAPI!.runFullAnalysis(sourceDir);
      
      if (result.success && result.permissionMap) {
        setData(result.permissionMap);
        await loadExistingData();
        toast.success('Analysis complete!', {
          description: `Found ${result.permissionMap.summary.totalEndpoints} endpoints`
        });
        setCurrentView('matrix');
      } else {
        toast.error('Analysis failed', {
          description: result.error
        });
      }
    } catch (err: any) {
      toast.error('Analysis failed', {
        description: err.message
      });
    } finally {
      setIsScanning(false);
    }
  }, [isElectron, sourceDir]);

  const handleRefresh = useCallback(() => {
    if (sourceDir) {
      handleRunAnalysis();
    } else {
      toast.info('Select a source directory first');
    }
  }, [sourceDir, handleRunAnalysis]);

  const handleExport = useCallback(async () => {
    if (!isElectron || !data) return;
    
    const result = await window.electronAPI!.exportData(data, 'permission-map.json');
    if (result.success) {
      toast.success('Exported successfully');
    }
  }, [isElectron, data]);

  const renderView = () => {
    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-3xl font-bold text-slate-600">PM</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Permission Map Loaded</h3>
          <p className="text-slate-400 max-w-md mb-6">
            Select a source directory and run analysis to visualize your API permissions.
          </p>
          
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
              onClick={handleSelectDirectory}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Select Source Directory
            </button>
            
            {sourceDir && (
              <button
                onClick={handleRunAnalysis}
                disabled={isScanning}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isScanning ? 'Analyzing...' : 'Run Analysis'}
              </button>
            )}
          </div>

          {isScanning && (
            <div className="mt-6 w-full max-w-sm">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>{scanProgress.phase === 'scanning' ? 'Scanning files...' : 'Building map...'}</span>
                <span>{scanProgress.progress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${scanProgress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    switch (currentView) {
      case 'matrix':
        return (
          <div className="space-y-6">
            <SummaryCards data={data} />
            <QuickStats data={data} />
            <MatrixView data={data} />
          </div>
        );
      case 'endpoints':
        return <EndpointAnalyzer data={data} />;
      case 'audit':
        return <AuditTool data={data} auditReport={auditData} />;
      case 'roles':
        return <RolesView data={data} />;
      case 'permissions':
        return <PermissionsView data={data} />;
      default:
        return <MatrixView data={data} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        currentView={currentView}
        setView={setCurrentView}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onSelectDirectory={handleSelectDirectory}
        onSelectDatabase={handleSelectDatabase}
        isScanning={isScanning}
        scanProgress={scanProgress}
        sourceDir={sourceDir}
        dbPath={dbPath}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            {currentView === 'matrix' && 'Permission Matrix'}
            {currentView === 'endpoints' && 'Endpoint Analyzer'}
            {currentView === 'audit' && 'Security Audit'}
            {currentView === 'roles' && 'Role Management'}
            {currentView === 'permissions' && 'Permission Catalog'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {currentView === 'matrix' && 'Visualize access patterns across all endpoints and roles'}
            {currentView === 'endpoints' && 'Deep-dive analysis of individual API endpoints'}
            {currentView === 'audit' && 'Identify security issues and permission gaps'}
            {currentView === 'roles' && 'Explore role definitions and their access levels'}
            {currentView === 'permissions' && 'Browse and manage system permissions'}
          </p>
        </div>

        {/* View Content */}
        {renderView()}
      </main>

      {/* Footer */}
      {data && (
        <footer className="border-t border-border mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-muted-foreground text-sm">
                Generated: {new Date(data.generatedAt).toLocaleString()}
              </div>
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                <span>{data.summary.totalEndpoints} endpoints</span>
                <span>•</span>
                <span>{data.summary.totalRoles} roles</span>
                <span>•</span>
                <span>{data.summary.totalPermissions} permissions</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
