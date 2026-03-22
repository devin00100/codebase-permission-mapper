import { useState } from 'react';
import { 
  Users, 
  Shield, 
  Key,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PermissionMap } from '@/types';

interface RolesViewProps {
  data: PermissionMap;
}

export function RolesView({ data }: RolesViewProps) {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const toggleRole = (roleId: string) => {
    setExpandedRole(expandedRole === roleId ? null : roleId);
  };

  const getRolePermissions = (roleId: string) => {
    // Get permissions from role-permission mappings
    const rolePerms = data.permissionMatrix
      .flatMap(pm => pm.accessibleRoles)
      .filter(ar => ar.roleId === roleId)
      .flatMap(ar => ar.viaPermissions);
    
    return [...new Set(rolePerms)];
  };

  const getAccessibleEndpoints = (roleId: string) => {
    return data.permissionMatrix.filter(pm => 
      pm.accessibleRoles.some(ar => ar.roleId === roleId)
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.roles.map((role) => {
          const isExpanded = expandedRole === role.id;
          const rolePermissions = getRolePermissions(role.id);
          const accessibleEndpoints = getAccessibleEndpoints(role.id);
          
          return (
            <Card 
              key={role.id} 
              className="bg-slate-800/50 border-slate-700 overflow-hidden"
            >
              <CardHeader 
                className="cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => toggleRole(role.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{role.name}</CardTitle>
                      <p className="text-slate-400 text-sm">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{accessibleEndpoints.length}</p>
                      <p className="text-slate-500 text-xs">endpoints</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="border-t border-slate-700">
                  <div className="space-y-4">
                    {/* Role Details */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{role.level}</p>
                        <p className="text-slate-500 text-xs">Level</p>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{rolePermissions.length}</p>
                        <p className="text-slate-500 text-xs">Permissions</p>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{accessibleEndpoints.length}</p>
                        <p className="text-slate-500 text-xs">Endpoints</p>
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                        <Key className="w-4 h-4 text-blue-400" />
                        Granted Permissions
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {rolePermissions.length > 0 ? (
                          rolePermissions.map(perm => (
                            <Badge 
                              key={perm}
                              className="bg-blue-500/20 text-blue-400 border-blue-500/30"
                            >
                              {perm}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-slate-500 text-sm italic">No direct permissions</p>
                        )}
                      </div>
                    </div>

                    {/* Accessible Endpoints */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-400" />
                        Accessible Endpoints ({accessibleEndpoints.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {accessibleEndpoints.map(endpoint => (
                          <div 
                            key={endpoint.endpointId}
                            className="flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg text-sm"
                          >
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <Badge 
                              className={`text-xs flex-shrink-0 ${
                                endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                                endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                                endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                endpoint.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                                'bg-slate-500/20 text-slate-400'
                              }`}
                            >
                              {endpoint.method}
                            </Badge>
                            <span className="text-slate-300 truncate">{endpoint.path}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Role Hierarchy */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Role Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[...data.roles]
                .sort((a, b) => b.level - a.level)
                .map((role, index, arr) => (
                  <div key={role.id} className="flex items-center gap-4">
                    <div 
                      className={`px-6 py-3 rounded-lg text-center ${
                        role.level >= 80 ? 'bg-red-500/20 border border-red-500/30' :
                        role.level >= 60 ? 'bg-orange-500/20 border border-orange-500/30' :
                        role.level >= 40 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                        role.level >= 20 ? 'bg-blue-500/20 border border-blue-500/30' :
                        'bg-slate-500/20 border border-slate-500/30'
                      }`}
                    >
                      <p className="text-white font-semibold">{role.name}</p>
                      <p className="text-slate-400 text-xs">Level {role.level}</p>
                    </div>
                    {index < arr.length - 1 && (
                      <div className="text-slate-600">
                        <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
