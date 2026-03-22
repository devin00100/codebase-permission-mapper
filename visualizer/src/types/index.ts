export interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
}

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  fullPath: string;
  file: string;
  line: number;
  framework: string;
  permissions: string[];
  middleware: string[];
  hasPermissionCheck: boolean;
  context: string;
}

export interface AccessibleRole {
  roleId: string;
  roleName: string;
  viaPermissions: string[];
}

export interface PermissionMatrixItem {
  endpointId: string;
  method: string;
  path: string;
  fullPath: string;
  file: string;
  line: number;
  requiredPermissions: string[];
  accessibleRoles: AccessibleRole[];
  accessibleRoleCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface UnprotectedEndpoint {
  endpointId: string;
  method: string;
  path: string;
  fullPath?: string;
  file: string;
  line: number;
}

export interface EndpointWithProtection extends PermissionMatrixItem {
  isProtected: true;
}

export interface EndpointWithoutProtection extends UnprotectedEndpoint {
  isProtected: false;
}

export type EndpointWithMetadata = EndpointWithProtection | EndpointWithoutProtection;

export interface PermissionMap {
  generatedAt: string;
  summary: {
    totalEndpoints: number;
    protectedEndpoints: number;
    unprotectedEndpoints: number;
    totalRoles: number;
    totalPermissions: number;
    orphanPermissions: number;
  };
  roles: Role[];
  permissions: Permission[];
  permissionMatrix: PermissionMatrixItem[];
  unprotectedEndpoints: UnprotectedEndpoint[];
  orphanPermissions: Permission[];
}

export interface AuditIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  endpoint?: PermissionMatrixItem | UnprotectedEndpoint;
  permission?: Permission;
  recommendation: string;
}

export interface AuditReport {
  generatedAt: string;
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  issues: AuditIssue[];
}

export type ViewMode = 'matrix' | 'endpoints' | 'audit' | 'roles' | 'permissions';
