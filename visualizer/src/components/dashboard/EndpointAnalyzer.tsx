import { useState, useMemo } from 'react';
import { 
  Search, 
  FileCode, 
  Shield, 
  Users, 
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Code
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PermissionMap, EndpointWithMetadata } from '@/types';

interface EndpointAnalyzerProps {
  data: PermissionMap;
}

export function EndpointAnalyzer({ data }: EndpointAnalyzerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointWithMetadata | null>(null);

  const allEndpoints = useMemo((): EndpointWithMetadata[] => {
    const protected_endpoints = data.permissionMatrix.map(item => ({
      ...item,
      isProtected: true as const
    }));
    const unprotected_endpoints = data.unprotectedEndpoints.map(item => ({
      ...item,
      isProtected: false as const
    }));
    return [...protected_endpoints, ...unprotected_endpoints];
  }, [data.permissionMatrix, data.unprotectedEndpoints]);

  const filteredEndpoints = useMemo(() => {
    return allEndpoints.filter(ep => {
      const path = (ep.fullPath || ep.path || '').toLowerCase();
      const method = (ep.method || '').toLowerCase();
      const file = (ep.file || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return path.includes(query) || method.includes(query) || file.includes(query);
    });
  }, [allEndpoints, searchQuery]);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'POST': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'PUT': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'PATCH': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const isProtectedEndpoint = (ep: EndpointWithMetadata | null): ep is EndpointWithMetadata & { isProtected: true } => {
    return ep !== null && 'isProtected' in ep && ep.isProtected === true;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Endpoint List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="border border-slate-700 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
          <div className="bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-400 sticky top-0">
            {filteredEndpoints.length} Endpoints
          </div>
          <div className="divide-y divide-slate-700">
            {filteredEndpoints.map((endpoint) => (
              <button
                key={endpoint.endpointId}
                onClick={() => setSelectedEndpoint(endpoint)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-800/50 transition-colors ${
                  selectedEndpoint?.endpointId === endpoint.endpointId ? 'bg-slate-800' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Badge className={`${getMethodColor(endpoint.method)} text-[10px] font-bold min-w-[50px] justify-center`}>
                    {endpoint.method}
                  </Badge>
                  <span className="text-white text-xs font-mono truncate flex-1">{endpoint.fullPath || endpoint.path}</span>
                  {!isProtectedEndpoint(endpoint) && (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="text-slate-500 text-xs mt-1 truncate">
                  {endpoint.file}:{endpoint.line}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Endpoint Details */}
      <div className="lg:col-span-2">
        {selectedEndpoint ? (
          <div className="space-y-6">
            {/* Header */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${getMethodColor(selectedEndpoint.method)} text-xl font-bold`}>
                        {selectedEndpoint.method}
                      </Badge>
                      <h2 className="text-2xl font-mono font-bold text-white tracking-tight">
                        {selectedEndpoint.fullPath || selectedEndpoint.path}
                      </h2>
                    </div>
                    <p className="text-slate-400 flex items-center gap-2">
                      <FileCode className="w-4 h-4" />
                      {selectedEndpoint.file}:{selectedEndpoint.line}
                    </p>
                  </div>
                  {isProtectedEndpoint(selectedEndpoint) ? (
                    <Badge className={`${getRiskColor(selectedEndpoint.riskLevel)}`}>
                      {selectedEndpoint.riskLevel.toUpperCase()} RISK
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500 text-white">
                      UNPROTECTED
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>

            {isProtectedEndpoint(selectedEndpoint) ? (
              <>
                {/* Required Permissions */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Key className="w-5 h-5 text-blue-400" />
                      Required Permissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedEndpoint.requiredPermissions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedEndpoint.requiredPermissions.map(perm => (
                          <Badge 
                            key={perm}
                            className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1"
                          >
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">No permissions required</p>
                    )}
                  </CardContent>
                </Card>

                {/* Role Access */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-400" />
                      Accessible By ({selectedEndpoint.accessibleRoleCount} roles)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedEndpoint.accessibleRoles.map(role => (
                        <div 
                          key={role.roleId}
                          className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-white font-medium">{role.roleName}</span>
                          </div>
                          <div className="flex gap-1">
                            {role.viaPermissions.map(perm => (
                              <Badge 
                                key={perm}
                                variant="outline"
                                className="text-xs border-slate-600 text-slate-400"
                              >
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Denied Roles */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-400" />
                      Denied Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.roles
                        .filter(role => !selectedEndpoint.accessibleRoles.some(ar => ar.roleId === role.id))
                        .map(role => (
                          <div 
                            key={role.id}
                            className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg"
                          >
                            <XCircle className="w-4 h-4 text-red-400" />
                            <span className="text-slate-300">{role.name}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Unprotected Endpoint Warning */
              <Card className="bg-red-500/10 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6" />
                    Security Warning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 mb-4">
                    This endpoint has <strong className="text-red-400">no permission check</strong> and is accessible to anyone.
                  </p>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Recommendation</h4>
                    <p className="text-slate-300 text-sm">
                      Add appropriate permission middleware to protect this endpoint. Example:
                    </p>
                    <pre className="mt-2 p-3 bg-slate-900 rounded text-sm text-green-400 overflow-x-auto">
                      <code>
                        {`router.${(selectedEndpoint as EndpointWithMetadata).method.toLowerCase()}('${(selectedEndpoint as EndpointWithMetadata).path}', 
  requirePermission('your.permission'),
  handler
);`}
                      </code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Code className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Select an Endpoint</h3>
            <p className="text-slate-400">Click on an endpoint from the list to analyze its permissions</p>
          </div>
        )}
      </div>
    </div>
  );
}
