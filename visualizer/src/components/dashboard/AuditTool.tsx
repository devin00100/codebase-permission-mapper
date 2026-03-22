import { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Info,
  FileCode,
  Key,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PermissionMap, AuditReport } from '@/types';
// import { mockAuditReport } from '@/data/mockData';

interface AuditToolProps {
  data: PermissionMap;
  auditReport: AuditReport;
}

export function AuditTool({ data, auditReport }: AuditToolProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  
  // Use passed audit report instead of mock
  // const auditReport = mockAuditReport;

  const filteredIssues = useMemo(() => {
    if (!selectedSeverity) return auditReport.issues;
    return auditReport.issues.filter(issue => issue.severity === selectedSeverity);
  }, [auditReport.issues, selectedSeverity]);

  const severityCounts = useMemo(() => ({
    critical: auditReport.issues.filter(i => i.severity === 'critical').length,
    high: auditReport.issues.filter(i => i.severity === 'high').length,
    medium: auditReport.issues.filter(i => i.severity === 'medium').length,
    low: auditReport.issues.filter(i => i.severity === 'low').length
  }), [auditReport.issues]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'high': return <AlertCircle className="w-5 h-5 text-orange-400" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'low': return <Info className="w-5 h-5 text-blue-400" />;
      default: return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      unprotected_endpoint: 'Unprotected Endpoint',
      overprivileged: 'Overprivileged Access',
      orphan_permission: 'Orphan Permission',
      sensitive_broad_access: 'Sensitive Broad Access'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${selectedSeverity === 'critical' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setSelectedSeverity(selectedSeverity === 'critical' ? null : 'critical')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Critical</p>
                <p className="text-2xl font-bold text-red-400">{severityCounts.critical}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${selectedSeverity === 'high' ? 'ring-2 ring-orange-500' : ''}`}
          onClick={() => setSelectedSeverity(selectedSeverity === 'high' ? null : 'high')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">High</p>
                <p className="text-2xl font-bold text-orange-400">{severityCounts.high}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${selectedSeverity === 'medium' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setSelectedSeverity(selectedSeverity === 'medium' ? null : 'medium')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Medium</p>
                <p className="text-2xl font-bold text-yellow-400">{severityCounts.medium}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${selectedSeverity === 'low' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setSelectedSeverity(selectedSeverity === 'low' ? null : 'low')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Low</p>
                <p className="text-2xl font-bold text-blue-400">{severityCounts.low}</p>
              </div>
              <Info className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Security Issues
            {selectedSeverity && (
              <Badge className={getSeverityColor(selectedSeverity)}>
                {selectedSeverity}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {selectedSeverity && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedSeverity(null)}
                className="text-slate-400"
              >
                Clear Filter
              </Button>
            )}
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-slate-300">No issues found</p>
              </div>
            ) : (
              filteredIssues.map((issue, index) => (
                <div 
                  key={index}
                  className="p-4 bg-slate-700/30 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline" className="border-slate-600 text-slate-400">
                          {getIssueTypeLabel(issue.type)}
                        </Badge>
                      </div>
                      <p className="text-white font-medium mb-2">{issue.message}</p>
                      
                      {issue.endpoint && (
                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2 font-mono">
                          <FileCode className="w-4 h-4" />
                          <span className="text-blue-400 font-bold">{issue.endpoint.method}</span>
                          <span className="text-white">{(issue.endpoint as any).fullPath || issue.endpoint.path}</span>
                          <span className="text-slate-500">
                            ({issue.endpoint.file}:{issue.endpoint.line})
                          </span>
                        </div>
                      )}

                      {issue.permission && (
                        <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                          <Key className="w-4 h-4" />
                          {issue.permission.key}
                          <span className="text-slate-500">
                            ({issue.permission.name})
                          </span>
                        </div>
                      )}

                      <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-sm text-slate-400">
                          <span className="font-medium text-slate-300">Recommendation:</span>{' '}
                          {issue.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400" />
              Unprotected Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{data.unprotectedEndpoints.length}</p>
            <p className="text-slate-400 text-sm">
              {((data.unprotectedEndpoints.length / data.summary.totalEndpoints) * 100).toFixed(1)}% of all endpoints
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" />
              Orphan Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{data.orphanPermissions.length}</p>
            <p className="text-slate-400 text-sm">
              Unused permissions in the system
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Coverage Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {((data.summary.protectedEndpoints / data.summary.totalEndpoints) * 100).toFixed(0)}%
            </p>
            <p className="text-slate-400 text-sm">
              {data.summary.protectedEndpoints} of {data.summary.totalEndpoints} endpoints protected
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
