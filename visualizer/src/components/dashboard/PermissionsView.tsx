import { useState, useMemo } from 'react';
import { 
  Search, 
  FileCode,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PermissionMap } from '@/types';

interface PermissionsViewProps {
  data: PermissionMap;
}

export function PermissionsView({ data }: PermissionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = [...new Set(data.permissions.map(p => p.category))];
    return cats.sort();
  }, [data.permissions]);

  const filteredPermissions = useMemo(() => {
    return data.permissions.filter(perm => {
      const key = (perm.key || '').toLowerCase();
      const name = (perm.name || '').toLowerCase();
      const description = (perm.description || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        key.includes(query) ||
        name.includes(query) ||
        description.includes(query);
      
      const matchesCategory = !selectedCategory || perm.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [data.permissions, searchQuery, selectedCategory]);

  const getPermissionUsage = (permissionKey: string) => {
    return data.permissionMatrix.filter(pm => 
      pm.requiredPermissions.includes(permissionKey)
    );
  };

  const getRolesWithPermission = (permissionKey: string) => {
    const roles = new Set<string>();
    data.permissionMatrix.forEach(pm => {
      pm.accessibleRoles.forEach(ar => {
        if (ar.viaPermissions.includes(permissionKey) || ar.viaPermissions.includes('admin.*')) {
          roles.add(ar.roleId);
        }
      });
    });
    return data.roles.filter(r => roles.has(r.id));
  };

  const isOrphan = (permissionKey: string) => {
    return data.orphanPermissions.some(op => op.key === permissionKey);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      users: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      items: 'bg-green-500/20 text-green-400 border-green-500/30',
      reports: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      settings: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      audit: 'bg-red-500/20 text-red-400 border-red-500/30',
      billing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      admin: 'bg-red-500/30 text-red-400 border-red-500/50',
      legacy: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      temp: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };
    return colors[category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="grid" className="data-[state=active]:bg-slate-700">Grid View</TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-slate-700">List View</TabsTrigger>
          <TabsTrigger value="orphan" className="data-[state=active]:bg-slate-700">
            Orphan ({data.orphanPermissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPermissions.map(permission => {
              const usage = getPermissionUsage(permission.key);
              const roles = getRolesWithPermission(permission.key);
              const orphan = isOrphan(permission.key);
              
              return (
                <Card 
                  key={permission.id} 
                  className={`bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors ${
                    orphan ? 'border-red-500/30 bg-red-500/5' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge className={getCategoryColor(permission.category)}>
                        {permission.category}
                      </Badge>
                      {orphan && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Orphan
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-white text-lg mt-2">{permission.name}</CardTitle>
                    <code className="text-sm text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                      {permission.key}
                    </code>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm mb-4">{permission.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <FileCode className="w-4 h-4 text-blue-400" />
                          <span className="text-xl font-bold text-white">{usage.length}</span>
                        </div>
                        <p className="text-slate-500 text-xs">Endpoints</p>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-green-400" />
                          <span className="text-xl font-bold text-white">{roles.length}</span>
                        </div>
                        <p className="text-slate-500 text-xs">Roles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-700">
                {filteredPermissions.map(permission => {
                  const usage = getPermissionUsage(permission.key);
                  const roles = getRolesWithPermission(permission.key);
                  const orphan = isOrphan(permission.key);
                  
                  return (
                    <div 
                      key={permission.id} 
                      className={`p-4 hover:bg-slate-800 transition-colors ${
                        orphan ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge className={getCategoryColor(permission.category)}>
                            {permission.category}
                          </Badge>
                          <div>
                            <p className="text-white font-medium">{permission.name}</p>
                            <code className="text-sm text-blue-400">{permission.key}</code>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xl font-bold text-white">{usage.length}</p>
                            <p className="text-slate-500 text-xs">endpoints</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-white">{roles.length}</p>
                            <p className="text-slate-500 text-xs">roles</p>
                          </div>
                          {orphan && (
                            <Badge className="bg-red-500/20 text-red-400">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Orphan
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orphan" className="mt-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Orphan Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.orphanPermissions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-slate-300">No orphan permissions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.orphanPermissions.map(permission => (
                    <div 
                      key={permission.id}
                      className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                    >
                      <div className="flex items-start gap-4">
                        <XCircle className="w-5 h-5 text-red-400 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getCategoryColor(permission.category)}>
                              {permission.category}
                            </Badge>
                            <span className="text-white font-medium">{permission.name}</span>
                          </div>
                          <code className="text-sm text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                            {permission.key}
                          </code>
                          <p className="text-slate-400 text-sm mt-2">{permission.description}</p>
                          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                            <p className="text-sm text-slate-400">
                              <span className="font-medium text-slate-300">Recommendation:</span>{' '}
                              Remove this unused permission or implement a corresponding endpoint.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
