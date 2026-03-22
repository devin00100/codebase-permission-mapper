#!/usr/bin/env node

/**
 * The Context Engine - Permission Mapper
 * Integrates raw endpoint data with organizational context from database
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

class ContextEngine {
  constructor(configPath = './mapper.config.json') {
    this.config = this.loadConfig(configPath);
    this.db = null;
    this.roles = [];
    this.permissions = [];
    this.rolePermissions = [];
    this.permissionMap = null;
    this.endpoints = [];
  }

  loadConfig(configPath) {
    try {
      const fullPath = path.resolve(configPath);
      const configData = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}. Using defaults.`);
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    return {
      database: {
        type: 'sqlite',
        connection: { filename: './database.sqlite' },
        tables: {
          roles: 'roles',
          permissions: 'permissions',
          rolePermissions: 'role_permissions'
        }
      },
      permissionHierarchy: { enabled: true, rules: [] },
      output: {
        artifactsDir: './artifacts',
        permissionsMap: 'permissions_map.json'
      }
    };
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    const dbType = this.config.database?.type || 'sqlite';
    
    if (dbType === 'sqlite') {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      const dbPath = path.resolve(this.config.database.connection.filename);
      
      if (!fs.existsSync(dbPath)) {
        console.warn(`⚠️  Database not found at ${dbPath}. Creating mock data...`);
        return this.createMockData();
      }
      
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      console.log(`✅ Connected to SQLite database: ${dbPath}`);
    } else if (dbType === 'postgresql' || dbType === 'mysql') {
      // Support for other databases can be added here
      throw new Error(`${dbType} support not yet implemented. Use sqlite for now.`);
    }
    
    return this.loadDataFromDatabase();
  }

  /**
   * Create mock data for demonstration
   */
  createMockData() {
    console.log('🎭 Creating mock role/permission data for demonstration...');
    
    this.roles = [
      { id: 'role_1', name: 'Super Admin', description: 'Full system access', level: 100 },
      { id: 'role_2', name: 'Admin', description: 'Administrative access', level: 80 },
      { id: 'role_3', name: 'Manager', description: 'Department management', level: 60 },
      { id: 'role_4', name: 'Clerk', description: 'Basic operations', level: 40 },
      { id: 'role_5', name: 'Viewer', description: 'Read-only access', level: 20 },
      { id: 'role_6', name: 'Guest', description: 'Limited access', level: 10 }
    ];
    
    this.permissions = [
      { id: 'perm_1', key: 'users.create', name: 'Create Users', description: 'Can create new users', category: 'users' },
      { id: 'perm_2', key: 'users.read', name: 'Read Users', description: 'Can view user information', category: 'users' },
      { id: 'perm_3', key: 'users.update', name: 'Update Users', description: 'Can modify user data', category: 'users' },
      { id: 'perm_4', key: 'users.delete', name: 'Delete Users', description: 'Can remove users', category: 'users' },
      { id: 'perm_5', key: 'items.create', name: 'Create Items', description: 'Can create items', category: 'items' },
      { id: 'perm_6', key: 'items.read', name: 'Read Items', description: 'Can view items', category: 'items' },
      { id: 'perm_7', key: 'items.update', name: 'Update Items', description: 'Can modify items', category: 'items' },
      { id: 'perm_8', key: 'items.delete', name: 'Delete Items', description: 'Can delete items', category: 'items' },
      { id: 'perm_9', key: 'reports.read', name: 'Read Reports', description: 'Can view reports', category: 'reports' },
      { id: 'perm_10', key: 'reports.export', name: 'Export Reports', description: 'Can export reports', category: 'reports' },
      { id: 'perm_11', key: 'settings.read', name: 'Read Settings', description: 'Can view settings', category: 'settings' },
      { id: 'perm_12', key: 'settings.update', name: 'Update Settings', description: 'Can modify settings', category: 'settings' },
      { id: 'perm_13', key: 'audit.read', name: 'Read Audit Logs', description: 'Can view audit logs', category: 'audit' },
      { id: 'perm_14', key: 'billing.manage', name: 'Manage Billing', description: 'Can manage billing', category: 'billing' },
      { id: 'perm_15', key: 'admin.*', name: 'Admin All', description: 'Full admin access', category: 'admin' }
    ];
    
    this.rolePermissions = [
      // Super Admin - all permissions
      { roleId: 'role_1', permissionKey: 'admin.*' },
      
      // Admin
      { roleId: 'role_2', permissionKey: 'users.create' },
      { roleId: 'role_2', permissionKey: 'users.read' },
      { roleId: 'role_2', permissionKey: 'users.update' },
      { roleId: 'role_2', permissionKey: 'users.delete' },
      { roleId: 'role_2', permissionKey: 'items.create' },
      { roleId: 'role_2', permissionKey: 'items.read' },
      { roleId: 'role_2', permissionKey: 'items.update' },
      { roleId: 'role_2', permissionKey: 'items.delete' },
      { roleId: 'role_2', permissionKey: 'reports.read' },
      { roleId: 'role_2', permissionKey: 'reports.export' },
      { roleId: 'role_2', permissionKey: 'settings.read' },
      { roleId: 'role_2', permissionKey: 'settings.update' },
      { roleId: 'role_2', permissionKey: 'audit.read' },
      { roleId: 'role_2', permissionKey: 'billing.manage' },
      
      // Manager
      { roleId: 'role_3', permissionKey: 'users.read' },
      { roleId: 'role_3', permissionKey: 'users.update' },
      { roleId: 'role_3', permissionKey: 'items.create' },
      { roleId: 'role_3', permissionKey: 'items.read' },
      { roleId: 'role_3', permissionKey: 'items.update' },
      { roleId: 'role_3', permissionKey: 'items.delete' },
      { roleId: 'role_3', permissionKey: 'reports.read' },
      { roleId: 'role_3', permissionKey: 'reports.export' },
      
      // Clerk
      { roleId: 'role_4', permissionKey: 'items.create' },
      { roleId: 'role_4', permissionKey: 'items.read' },
      { roleId: 'role_4', permissionKey: 'items.update' },
      { roleId: 'role_4', permissionKey: 'reports.read' },
      
      // Viewer
      { roleId: 'role_5', permissionKey: 'items.read' },
      { roleId: 'role_5', permissionKey: 'reports.read' },
      
      // Guest
      { roleId: 'role_6', permissionKey: 'items.read' }
    ];
    
    console.log(`✅ Created ${this.roles.length} roles, ${this.permissions.length} permissions`);
    return true;
  }

  /**
   * Load data from database
   */
  async loadDataFromDatabase() {
    const tables = this.config.database?.tables || {};
    const columns = this.config.database?.columns || {};
    
    // Load roles
    const rolesTable = tables.roles || 'roles';
    this.roles = await this.db.all(`SELECT * FROM ${rolesTable}`);
    
    // Load permissions
    const permissionsTable = tables.permissions || 'permissions';
    try {
      this.permissions = await this.db.all(`SELECT * FROM ${permissionsTable}`);
    } catch (e) {
      console.warn(`⚠️  Permissions table '${permissionsTable}' not found. Deriving from role_permissions.`);
      const rpTable = tables.rolePermissions || 'role_permissions';
      const permissionColumn = columns.rolePermission?.permissionKey || 'permission';
      const rows = await this.db.all(`SELECT DISTINCT ${permissionColumn} as key FROM ${rpTable}`);
      this.permissions = rows.filter(r => r.key !== '*').map(r => ({
        key: r.key,
        name: r.key,
        category: r.key.split('.')[0] || 'general'
      }));
    }
    
    // Load role-permission mappings
    const rpTable = tables.rolePermissions || 'role_permissions';
    this.rolePermissions = await this.db.all(`SELECT * FROM ${rpTable}`);
    
    console.log(`📊 Loaded ${this.roles.length} roles, ${this.permissions.length} permissions, ${this.rolePermissions.length} mappings`);
  }

  /**
   * Load scan results from scanner
   */
  async loadScanResults(scanResultsPath) {
    const fullPath = path.resolve(scanResultsPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Scan results not found: ${fullPath}`);
    }
    
    const data = JSON.parse(await readFile(fullPath, 'utf8'));
    this.endpoints = data.endpoints || [];
    
    console.log(`📥 Loaded ${this.endpoints.length} endpoints from scan results`);
    return this.endpoints;
  }

  /**
   * Build the complete permission map
   */
  buildPermissionMap() {
    console.log('🏗️  Building permission map...');
    
    const permissionMatrix = [];
    const orphanPermissions = [];
    const unprotectedEndpoints = [];
    
    // For each endpoint, determine which roles can access it
    for (const endpoint of this.endpoints) {
      const accessibleRoles = [];
      const requiredPermissions = endpoint.permissions || [];
      
      // If no permissions required, mark as unprotected
      if (requiredPermissions.length === 0) {
        unprotectedEndpoints.push({
          endpointId: endpoint.id,
          method: endpoint.method,
          path: endpoint.path,
          file: endpoint.file,
          line: endpoint.line
        });
        continue;
      }
      
      // Check each role
      for (const role of this.roles) {
        const rolePerms = this.getRolePermissions(role.id);
        const canAccess = this.checkAccess(requiredPermissions, rolePerms);
        
        if (canAccess) {
          accessibleRoles.push({
            roleId: role.id,
            roleName: role.name,
            viaPermissions: this.getMatchingPermissions(requiredPermissions, rolePerms)
          });
        }
      }
      
      permissionMatrix.push({
        endpointId: endpoint.id,
        method: endpoint.method,
        path: endpoint.path,
        fullPath: endpoint.fullPath,
        file: endpoint.file,
        line: endpoint.line,
        requiredPermissions,
        accessibleRoles,
        accessibleRoleCount: accessibleRoles.length,
        riskLevel: this.calculateRiskLevel(endpoint, accessibleRoles.length)
      });
    }
    
    // Find orphan permissions (permissions not used by any endpoint)
    const usedPermissions = new Set(this.endpoints.flatMap(ep => ep.permissions));
    orphanPermissions.push(...this.permissions.filter(p => !usedPermissions.has(p.key)));
    
    this.permissionMap = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalEndpoints: this.endpoints.length,
        protectedEndpoints: permissionMatrix.length,
        unprotectedEndpoints: unprotectedEndpoints.length,
        totalRoles: this.roles.length,
        totalPermissions: this.permissions.length,
        orphanPermissions: orphanPermissions.length
      },
      roles: this.roles,
      permissions: this.permissions,
      permissionMatrix,
      unprotectedEndpoints,
      orphanPermissions
    };
    
    console.log('✅ Permission map built successfully');
    console.log(`   Protected: ${permissionMatrix.length}, Unprotected: ${unprotectedEndpoints.length}, Orphans: ${orphanPermissions.length}`);
    
    return this.permissionMap;
  }

  /**
   * Get all permissions for a role (including implied permissions)
   */
  getRolePermissions(roleId) {
    const permissionColumn = this.config.database?.columns?.rolePermission?.permissionKey || 'permission';
    const directPermissions = this.rolePermissions
      .filter(rp => rp.roleId === roleId || rp.role_id === roleId)
      .map(rp => rp[permissionColumn] || rp.permissionKey || rp.permission_key)
      .filter(Boolean);
    
    const allPermissions = new Set(directPermissions);
    
    // Apply permission hierarchy rules
    if (this.config.permissionHierarchy?.enabled) {
      const rules = this.config.permissionHierarchy.rules || [];
      
      for (const perm of directPermissions) {
        for (const rule of rules) {
          if (this.matchPermissionPattern(perm, rule.permission)) {
            for (const implied of rule.implies || []) {
              allPermissions.add(implied);
            }
          }
        }
      }
    }
    
    // Handle wildcard permissions (admin.*)
    for (const perm of directPermissions) {
      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -2);
        // Add all permissions with this prefix
        this.permissions
          .filter(p => p.key.startsWith(prefix + '.') || p.category === prefix)
          .forEach(p => allPermissions.add(p.key));
      }
    }
    
    return [...allPermissions];
  }

  /**
   * Check if permission matches pattern (supports wildcards)
   */
  matchPermissionPattern(permission, pattern) {
    if (pattern === permission) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return permission.startsWith(prefix + '.');
    }
    if (pattern === '*') return true;
    return false;
  }

  /**
   * Check if role can access endpoint with required permissions
   */
  checkAccess(requiredPermissions, rolePermissions) {
    // If no permissions required, anyone can access
    if (requiredPermissions.length === 0) return true;
    
    // Check if role has admin.* or * permission
    if (rolePermissions.some(p => p === 'admin.*' || p === '*')) {
      return true;
    }
    
    // Check if role has all required permissions
    return requiredPermissions.every(req => 
      rolePermissions.some(rolePerm => this.matchPermissionPattern(rolePerm, req) || 
                                       this.matchPermissionPattern(req, rolePerm))
    );
  }

  /**
   * Get which permissions grant access
   */
  getMatchingPermissions(requiredPermissions, rolePermissions) {
    const matches = [];
    
    for (const req of requiredPermissions) {
      for (const rolePerm of rolePermissions) {
        if (this.matchPermissionPattern(rolePerm, req) || 
            req === rolePerm ||
            rolePerm === 'admin.*' ||
            rolePerm === '*') {
          matches.push(rolePerm);
        }
      }
    }
    
    return [...new Set(matches)];
  }

  /**
   * Calculate risk level for endpoint
   */
  calculateRiskLevel(endpoint, accessibleRoleCount) {
    // High risk: many roles can access sensitive operations
    const sensitiveMethods = ['DELETE', 'PUT', 'PATCH'];
    const isSensitive = sensitiveMethods.includes(endpoint.method);
    
    if (!endpoint.hasPermissionCheck) return 'critical';
    if (isSensitive && accessibleRoleCount > 3) return 'high';
    if (accessibleRoleCount > 5) return 'medium';
    return 'low';
  }

  /**
   * Generate audit report
   */
  generateAuditReport() {
    if (!this.permissionMap) {
      throw new Error('Permission map not built. Call buildPermissionMap() first.');
    }
    
    const issues = [];
    
    // Critical: Endpoints without permission checks
    for (const ep of this.permissionMap.unprotectedEndpoints) {
      issues.push({
        severity: 'critical',
        type: 'unprotected_endpoint',
        message: `Endpoint ${ep.method} ${ep.path} has no permission check`,
        endpoint: ep,
        recommendation: 'Add appropriate permission check middleware'
      });
    }
    
    // High: Endpoints accessible by too many roles
    for (const item of this.permissionMap.permissionMatrix) {
      if (item.accessibleRoleCount > 5) {
        issues.push({
          severity: 'high',
          type: 'overprivileged',
          message: `Endpoint ${item.method} ${item.path} is accessible by ${item.accessibleRoleCount} roles`,
          endpoint: item,
          recommendation: 'Review and restrict permissions'
        });
      }
    }
    
    // Medium: Orphan permissions
    for (const perm of this.permissionMap.orphanPermissions) {
      issues.push({
        severity: 'medium',
        type: 'orphan_permission',
        message: `Permission '${perm.key}' is not used by any endpoint`,
        permission: perm,
        recommendation: 'Remove unused permission or implement corresponding endpoint'
      });
    }
    
    // Low: Sensitive endpoints with broad access
    const sensitivePatterns = ['delete', 'remove', 'admin', 'config'];
    for (const item of this.permissionMap.permissionMatrix) {
      const isSensitive = sensitivePatterns.some(p => 
        item.path.toLowerCase().includes(p) || 
        item.requiredPermissions.some(perm => perm.toLowerCase().includes(p))
      );
      
      if (isSensitive && item.accessibleRoleCount > 2) {
        issues.push({
          severity: 'low',
          type: 'sensitive_broad_access',
          message: `Sensitive endpoint ${item.method} ${item.path} has broad access`,
          endpoint: item,
          recommendation: 'Consider restricting access to sensitive operations'
        });
      }
    }
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalIssues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      },
      issues
    };
    
    console.log(`📋 Audit report generated: ${issues.length} issues found`);
    console.log(`   Critical: ${report.summary.critical}, High: ${report.summary.high}, Medium: ${report.summary.medium}, Low: ${report.summary.low}`);
    
    return report;
  }

  /**
   * Export permission map to file
   */
  async exportPermissionMap(outputPath) {
    if (!this.permissionMap) {
      throw new Error('Permission map not built. Call buildPermissionMap() first.');
    }
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    await writeFile(outputPath, JSON.stringify(this.permissionMap, null, 2));
    console.log(`💾 Permission map exported to: ${outputPath}`);
    
    return outputPath;
  }

  /**
   * Export audit report to file
   */
  async exportAuditReport(outputPath) {
    const report = this.generateAuditReport();
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    await writeFile(outputPath, JSON.stringify(report, null, 2));
    console.log(`💾 Audit report exported to: ${outputPath}`);
    
    return outputPath;
  }

  /**
   * Generate markdown documentation
   */
  async generateDocumentation(outputPath) {
    if (!this.permissionMap) {
      throw new Error('Permission map not built. Call buildPermissionMap() first.');
    }
    
    let markdown = `# Permission Matrix Documentation\n\n`;
    markdown += `> Generated: ${new Date().toLocaleString()}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Endpoints**: ${this.permissionMap.summary.totalEndpoints}\n`;
    markdown += `- **Protected Endpoints**: ${this.permissionMap.summary.protectedEndpoints}\n`;
    markdown += `- **Unprotected Endpoints**: ${this.permissionMap.summary.unprotectedEndpoints}\n`;
    markdown += `- **Total Roles**: ${this.permissionMap.summary.totalRoles}\n`;
    markdown += `- **Total Permissions**: ${this.permissionMap.summary.totalPermissions}\n`;
    markdown += `- **Orphan Permissions**: ${this.permissionMap.summary.orphanPermissions}\n\n`;
    
    // Roles
    markdown += `## Roles\n\n`;
    markdown += `| Role | Description | Level |\n`;
    markdown += `|------|-------------|-------|\n`;
    for (const role of this.permissionMap.roles) {
      markdown += `| ${role.name} | ${role.description || '-'} | ${role.level || '-'} |\n`;
    }
    markdown += `\n`;
    
    // Permissions
    markdown += `## Permissions\n\n`;
    markdown += `| Permission | Name | Category | Description |\n`;
    markdown += `|------------|------|----------|-------------|\n`;
    for (const perm of this.permissionMap.permissions) {
      markdown += `| ${perm.key} | ${perm.name || '-'} | ${perm.category || '-'} | ${perm.description || '-'} |\n`;
    }
    markdown += `\n`;
    
    // Permission Matrix
    markdown += `## Permission Matrix\n\n`;
    markdown += `### By Endpoint\n\n`;
    
    for (const item of this.permissionMap.permissionMatrix) {
      markdown += `#### ${item.method} ${item.path}\n\n`;
      markdown += `- **File**: ${item.file}:${item.line}\n`;
      markdown += `- **Required Permissions**: ${item.requiredPermissions.join(', ') || 'None'}\n`;
      markdown += `- **Accessible By**: ${item.accessibleRoleCount} roles\n`;
      markdown += `- **Risk Level**: ${item.riskLevel}\n\n`;
      
      if (item.accessibleRoles.length > 0) {
        markdown += `| Role | Via Permissions |\n`;
        markdown += `|------|----------------|\n`;
        for (const role of item.accessibleRoles) {
          markdown += `| ${role.roleName} | ${role.viaPermissions.join(', ')} |\n`;
        }
        markdown += `\n`;
      }
    }
    
    // Unprotected Endpoints
    if (this.permissionMap.unprotectedEndpoints.length > 0) {
      markdown += `## ⚠️ Unprotected Endpoints\n\n`;
      markdown += `| Method | Path | File | Line |\n`;
      markdown += `|--------|------|------|------|\n`;
      for (const ep of this.permissionMap.unprotectedEndpoints) {
        markdown += `| ${ep.method} | ${ep.path} | ${ep.file} | ${ep.line} |\n`;
      }
      markdown += `\n`;
    }
    
    // Orphan Permissions
    if (this.permissionMap.orphanPermissions.length > 0) {
      markdown += `## 📝 Orphan Permissions\n\n`;
      markdown += `| Permission | Name | Category |\n`;
      markdown += `|------------|------|----------|\n`;
      for (const perm of this.permissionMap.orphanPermissions) {
        markdown += `| ${perm.key} | ${perm.name || '-'} | ${perm.category || '-'} |\n`;
      }
      markdown += `\n`;
    }
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    await writeFile(outputPath, markdown);
    console.log(`📄 Documentation exported to: ${outputPath}`);
    
    return outputPath;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const scanResultsPath = args[0] || './artifacts/scan_results.json';
  const configPath = args[1] || './mapper.config.json';
  const outputDir = args[2] || './artifacts';
  
  const engine = new ContextEngine(configPath);
  
  (async () => {
    try {
      await engine.initializeDatabase();
      await engine.loadScanResults(scanResultsPath);
      engine.buildPermissionMap();
      
      await engine.exportPermissionMap(path.join(outputDir, 'permissions_map.json'));
      await engine.exportAuditReport(path.join(outputDir, 'audit_report.json'));
      await engine.generateDocumentation(path.join(outputDir, 'PERMISSIONS.md'));
      
      console.log('\n✅ Context Engine processing complete!');
    } catch (error) {
      console.error('❌ Context Engine failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { ContextEngine };
