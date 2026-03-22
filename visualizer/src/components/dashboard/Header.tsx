import { Shield, Menu, X, RefreshCw, Download, FolderOpen, Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ViewMode } from '@/types';

interface HeaderProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onRefresh: () => void;
  onExport: () => void;
  onSelectDirectory: () => void;
  onSelectDatabase: () => void;
  isScanning: boolean;
  scanProgress: { phase: string; progress: number };
  sourceDir: string;
  dbPath: string;
}

const navItems: { id: ViewMode; label: string }[] = [
  { id: 'matrix', label: 'Matrix View' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'audit', label: 'Audit' },
  { id: 'roles', label: 'Roles' },
  { id: 'permissions', label: 'Permissions' }
];

export function Header({ 
  currentView, 
  setView, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen,
  onRefresh,
  onExport,
  onSelectDirectory,
  onSelectDatabase,
  isScanning,
  scanProgress,
  sourceDir,
  dbPath
}: HeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white">Permission Mapper</h1>
            <p className="text-xs text-slate-400">Js/Ts Security Analysis</p>
          </div>

          {/* Source Selection */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={onSelectDirectory}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                sourceDir 
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}
              title={sourceDir || 'Select source directory'}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm max-w-[150px] truncate">
                {sourceDir ? sourceDir.split(/[/\\]/).pop() : 'Select Source'}
              </span>
            </button>
            
            <button
              onClick={onSelectDatabase}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                dbPath 
                  ? 'border-violet-500/50 bg-violet-500/10 text-violet-400' 
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}
              title={dbPath || 'Select database'}
            >
              <Database className="w-4 h-4" />
              <span className="text-sm max-w-[120px] truncate">
                {dbPath ? dbPath.split(/[/\\]/).pop() : 'Database'}
              </span>
            </button>

            {isScanning && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {scanProgress.progress}%
              </Badge>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExport}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-4 py-3 rounded-lg text-sm font-medium text-left transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {/* Mobile Source Selection */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
              <button
                onClick={() => { onSelectDirectory(); setIsMobileMenuOpen(false); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  sourceDir 
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm">{sourceDir ? 'Source' : 'Select Source'}</span>
              </button>
              
              <button
                onClick={() => { onSelectDatabase(); setIsMobileMenuOpen(false); }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  dbPath 
                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-400' 
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                <Database className="w-4 h-4" />
                <span className="text-sm">{dbPath ? 'DB' : 'Database'}</span>
              </button>
            </div>

            {isScanning && (
              <div className="mt-3 px-2">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning... {scanProgress.progress}%
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${scanProgress.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onRefresh(); setIsMobileMenuOpen(false); }}
                className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onExport(); setIsMobileMenuOpen(false); }}
                className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
