import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  AlertTriangle,
  FileCode
} from 'lucide-react';
import type { PermissionMap } from '@/types';

interface SummaryCardsProps {
  data: PermissionMap;
}

interface CardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
}

const colorClasses = {
  blue: 'from-blue-500 to-blue-600 bg-blue-500/10 text-blue-400',
  green: 'from-emerald-500 to-emerald-600 bg-emerald-500/10 text-emerald-400',
  yellow: 'from-amber-500 to-amber-600 bg-amber-500/10 text-amber-400',
  red: 'from-red-500 to-red-600 bg-red-500/10 text-red-400',
  purple: 'from-purple-500 to-purple-600 bg-purple-500/10 text-purple-400',
  indigo: 'from-indigo-500 to-indigo-600 bg-indigo-500/10 text-indigo-400'
};

function SummaryCard({ title, value, subtitle, icon: Icon, color }: CardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const { summary } = data;
  
  const coveragePercent = summary.totalEndpoints > 0 
    ? Math.round((summary.protectedEndpoints / summary.totalEndpoints) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Total Endpoints"
        value={summary.totalEndpoints}
        subtitle={`${summary.protectedEndpoints} protected, ${summary.unprotectedEndpoints} unprotected`}
        icon={FileCode}
        color="blue"
      />
      
      <SummaryCard
        title="Permission Coverage"
        value={`${coveragePercent}%`}
        subtitle={coveragePercent === 100 ? 'Full coverage achieved' : `${summary.unprotectedEndpoints} endpoints need attention`}
        icon={coveragePercent === 100 ? ShieldCheck : ShieldAlert}
        color={coveragePercent === 100 ? 'green' : coveragePercent >= 80 ? 'yellow' : 'red'}
      />
      
      <SummaryCard
        title="Roles & Permissions"
        value={`${summary.totalRoles} / ${summary.totalPermissions}`}
        subtitle={`${summary.totalRoles} roles with ${summary.totalPermissions} permissions`}
        icon={Users}
        color="purple"
      />
      
      <SummaryCard
        title="Security Issues"
        value={summary.unprotectedEndpoints + summary.orphanPermissions}
        subtitle={`${summary.unprotectedEndpoints} unprotected, ${summary.orphanPermissions} orphan`}
        icon={AlertTriangle}
        color={summary.unprotectedEndpoints + summary.orphanPermissions === 0 ? 'green' : 'red'}
      />
    </div>
  );
}

export function QuickStats({ data }: SummaryCardsProps) {
  const methodCounts = data.permissionMatrix.reduce((acc, item) => {
    acc[item.method] = (acc[item.method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const riskCounts = data.permissionMatrix.reduce((acc, item) => {
    acc[item.riskLevel] = (acc[item.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* HTTP Methods Distribution */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-400" />
          HTTP Methods
        </h3>
        <div className="space-y-3">
          {Object.entries(methodCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([method, count]) => (
              <div key={method} className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  method === 'GET' ? 'bg-green-500/20 text-green-400' :
                  method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                  method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                  method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                  method === 'PATCH' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {method}
                </span>
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(count / data.permissionMatrix.length) * 100}%` }}
                  />
                </div>
                <span className="text-slate-400 text-sm w-8 text-right">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Risk Level Distribution */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          Risk Distribution
        </h3>
        <div className="space-y-3">
          {[
            { level: 'critical', label: 'Critical', color: 'bg-red-500', textColor: 'text-red-400' },
            { level: 'high', label: 'High', color: 'bg-orange-500', textColor: 'text-orange-400' },
            { level: 'medium', label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
            { level: 'low', label: 'Low', color: 'bg-green-500', textColor: 'text-green-400' }
          ].map(({ level, label, color, textColor }) => {
            const count = riskCounts[level] || 0;
            const total = data.permissionMatrix.length;
            return (
              <div key={level} className="flex items-center gap-3">
                <span className={`text-sm font-medium w-20 ${textColor}`}>{label}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div 
                    className={`${color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-slate-400 text-sm w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
