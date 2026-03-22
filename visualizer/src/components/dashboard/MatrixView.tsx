import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  Check,
  X,
  Shield,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PermissionMap, PermissionMatrixItem } from '@/types';

interface MatrixViewProps {
  data: PermissionMap;
}

type SortField = 'path' | 'method' | 'riskLevel' | 'accessibleRoleCount';
type SortDirection = 'asc' | 'desc';

export function MatrixView({ data }: MatrixViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('path');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const allMethods = useMemo(() => 
    [...new Set(data.permissionMatrix.map(item => item.method))],
    [data.permissionMatrix]
  );

  const filteredData = useMemo(() => {
    let filtered = data.permissionMatrix.filter(item => {
      const fullPath = (item.fullPath || '').toLowerCase();
      const path = (item.path || '').toLowerCase();
      const file = (item.file || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        fullPath.includes(query) ||
        path.includes(query) ||
        file.includes(query) ||
        item.requiredPermissions.some(p => (p || '').toLowerCase().includes(query));
      
      const matchesMethod = selectedMethods.length === 0 || selectedMethods.includes(item.method);
      
      const matchesRole = selectedRoles.length === 0 || 
        item.accessibleRoles.some(ar => selectedRoles.includes(ar.roleId));
      
      return matchesSearch && matchesMethod && matchesRole;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'path':
          comparison = (a.fullPath || a.path).localeCompare(b.fullPath || b.path);
          break;
        case 'method':
          comparison = a.method.localeCompare(b.method);
          break;
        case 'riskLevel':
          const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          comparison = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
          break;
        case 'accessibleRoleCount':
          comparison = a.accessibleRoleCount - b.accessibleRoleCount;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data.permissionMatrix, searchQuery, selectedMethods, selectedRoles, sortField, sortDirection]);

  const toggleRowExpansion = (endpointId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(endpointId)) {
      newExpanded.delete(endpointId);
    } else {
      newExpanded.add(endpointId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

  const canAccess = (endpoint: PermissionMatrixItem, roleId: string) => {
    return endpoint.accessibleRoles.some(ar => ar.roleId === roleId);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search endpoints, files, or permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  <Filter className="w-4 h-4 mr-2" />
                  Methods
                  {selectedMethods.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-600 text-white">
                      {selectedMethods.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-700">
                {allMethods.map(method => (
                  <DropdownMenuCheckboxItem
                    key={method}
                    checked={selectedMethods.includes(method)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMethods([...selectedMethods, method]);
                      } else {
                        setSelectedMethods(selectedMethods.filter(m => m !== method));
                      }
                    }}
                    className="text-slate-300"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-bold mr-2 ${getMethodColor(method)}`}>
                      {method}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  <Shield className="w-4 h-4 mr-2" />
                  Roles
                  {selectedRoles.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-600 text-white">
                      {selectedRoles.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-700 max-h-64 overflow-auto">
                {data.roles.map(role => (
                  <DropdownMenuCheckboxItem
                    key={role.id}
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRoles([...selectedRoles, role.id]);
                      } else {
                        setSelectedRoles(selectedRoles.filter(r => r !== role.id));
                      }
                    }}
                    className="text-slate-300"
                  >
                    {role.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-slate-400">
          Showing {filteredData.length} of {data.permissionMatrix.length} endpoints
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto border border-slate-700 rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/80">
                <th className="px-4 py-3 text-left">
                  <button 
                    onClick={() => handleSort('method')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Method
                    {sortField === 'method' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button 
                    onClick={() => handleSort('path')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Endpoint
                    {sortField === 'path' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Permissions</th>
                <th className="px-4 py-3 text-center">
                  <button 
                    onClick={() => handleSort('riskLevel')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white mx-auto"
                  >
                    Risk
                    {sortField === 'riskLevel' && (
                      sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                {data.roles.map(role => (
                  <th key={role.id} className="px-2 py-3 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-semibold text-slate-400 truncate max-w-20 block">
                          {role.name.split(' ')[0]}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{role.name}</p>
                        <p className="text-xs text-slate-400">{role.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredData.map((endpoint) => (
                <>
                  <tr 
                    key={endpoint.endpointId}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Badge className={`${getMethodColor(endpoint.method)} font-bold`}>
                        {endpoint.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-white font-mono text-sm">{endpoint.fullPath || endpoint.path}</span>
                        <span className="text-slate-500 text-[10px] truncate max-w-[200px]" title={endpoint.file}>
                          {endpoint.file}:{endpoint.line}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {endpoint.requiredPermissions.length > 0 ? (
                          endpoint.requiredPermissions.map(perm => (
                            <Badge 
                              key={perm} 
                              variant="outline" 
                              className="text-xs border-slate-600 text-slate-400"
                            >
                              {perm}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${getRiskColor(endpoint.riskLevel)} text-xs`}>
                        {endpoint.riskLevel}
                      </Badge>
                    </td>
                    {data.roles.map(role => (
                      <td key={role.id} className="px-2 py-3 text-center">
                        {canAccess(endpoint, role.id) ? (
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                            <Check className="w-4 h-4 text-green-400" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto">
                            <X className="w-3 h-3 text-slate-500" />
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(endpoint.endpointId)}
                        className="text-slate-400 hover:text-white"
                      >
                        {expandedRows.has(endpoint.endpointId) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                  {expandedRows.has(endpoint.endpointId) && (
                    <tr className="bg-slate-800/30">
                      <td colSpan={5 + data.roles.length} className="px-4 py-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Accessible By</h4>
                            <div className="flex flex-wrap gap-2">
                              {endpoint.accessibleRoles.map(ar => (
                                <Badge 
                                  key={ar.roleId}
                                  className="bg-blue-500/20 text-blue-400 border-blue-500/30"
                                >
                                  {ar.roleName}
                                  <span className="text-xs text-slate-400 ml-1">
                                    ({ar.viaPermissions.join(', ')})
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Full Path:</span>
                              <span className="text-slate-300 ml-2">{endpoint.fullPath}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Accessible Roles:</span>
                              <span className="text-slate-300 ml-2">{endpoint.accessibleRoleCount}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Info className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No endpoints match your filters</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
