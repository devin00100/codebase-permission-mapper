#!/usr/bin/env node

/**
 * Electron Main Process
 * Packages the permission-mapper as a standalone Windows desktop application
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Get the correct base path whether packaged or not
function getAppPath() {
  // When packaged, app.getAppPath() returns the asar root (where electron-main.js is)
  // When not packaged, __dirname is the directory containing electron-main.js
  if (app.isPackaged) {
    return app.getAppPath();
  }
  return __dirname;
}

function getDistPath() {
  // visualizer/dist is a sibling to electron-main.js in both packaged and unpacked
  return path.join(getAppPath(), 'visualizer', 'dist');
}

// ============================================
// Permission Scanner (embedded)
// ============================================
class PermissionScanner {
  constructor(configPath) {
    this.config = this.loadConfig(configPath);
    this.endpoints = [];
    this.discoveredFiles = [];
    this.errors = [];
    this.constants = {};
    this.sourceDir = '';
  }

  loadConfig(configPath) {
    try {
      const fullPath = path.resolve(configPath);
      if (fs.existsSync(fullPath)) {
        return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      }
    } catch (error) {}
    return this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      scanner: {
        framework: 'express',
        fileExtensions: ['.js', '.ts', '.jsx', '.tsx'],
        excludePatterns: ['node_modules', 'dist', 'build']
      }
    };
  }

  async scanDirectory(sourceDir) {
    this.endpoints = [];
    this.discoveredFiles = [];
    this.errors = [];
    this.sourceDir = path.resolve(sourceDir);

    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory does not exist: ${this.sourceDir}`);
    }

    await this.loadConstants();
    await this.walkDirectory(this.sourceDir);
    
    return {
      endpoints: this.endpoints,
      files: this.discoveredFiles,
      errors: this.errors,
      summary: this.generateSummary()
    };
  }

  async loadConstants() {
    const searchPaths = [
      path.join(this.sourceDir, 'auth', 'rbac.js'),
      path.join(this.sourceDir, 'auth', 'rbac.ts'),
      path.join(this.sourceDir, '..', 'auth', 'rbac.js'),
      path.join(this.sourceDir, '..', 'auth', 'rbac.ts'),
    ];

    for (const rbacPath of searchPaths) {
      if (fs.existsSync(rbacPath)) {
        try {
          const content = fs.readFileSync(rbacPath, 'utf8');
          const permMatch = content.match(/export\s+const\s+PERMISSIONS\s*=\s*Object\.freeze\s*\(\s*\{([\s\S]*?)\}\s*\)/);
          if (permMatch) {
            const entries = permMatch[1].split(',').filter(line => line.includes(':'));
            entries.forEach(entry => {
              const [key, value] = entry.split(':').map(s => s.trim());
              if (key && value) {
                this.constants[key] = value.replace(/['"`]/g, '');
              }
            });
            return;
          }
        } catch (err) {}
      }
    }
  }

  async walkDirectory(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      try {
        const fullPath = path.join(dir, entry);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          if (this.shouldExclude(entry)) continue;
          await this.walkDirectory(fullPath);
        } else if (stats.isFile()) {
          if (this.shouldIncludeFile(entry)) {
            await this.scanFile(fullPath);
          }
        }
      } catch (err) {}
    }
  }

  shouldExclude(dirName) {
    const excludePatterns = this.config.scanner?.excludePatterns || ['node_modules', 'dist', 'build'];
    return excludePatterns.some(pattern => 
      dirName.includes(pattern) || (pattern.startsWith('.') && dirName.startsWith('.'))
    );
  }

  shouldIncludeFile(fileName) {
    const extensions = this.config.scanner?.fileExtensions || ['.js', '.ts'];
    return extensions.some(ext => fileName.endsWith(ext));
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      this.discoveredFiles.push(relativePath);
      const endpoints = this.extractEndpoints(content, filePath, relativePath);
      this.endpoints.push(...endpoints);
    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
    }
  }

  extractEndpoints(content, filePath, relativePath) {
    const endpoints = [];
    const seenKeys = new Set();
    const framework = this.detectFramework(content, filePath);
    const patterns = this.getPatternsForFramework(framework);
    const basePath = this.detectBasePath(content, filePath);

    for (const pattern of patterns) {
      let methodMatch;
      const regex = new RegExp(pattern.regex.source, 'gi');
      
      while ((methodMatch = regex.exec(content)) !== null) {
        try {
          const method = (methodMatch[1] || pattern.method).toUpperCase();
          const startIndex = methodMatch.index;
          
          let parenCount = 1, endIndex = startIndex + methodMatch[0].length;
          while (endIndex < content.length && parenCount > 0) {
            if (content[endIndex] === '(') parenCount++;
            else if (content[endIndex] === ')') parenCount--;
            endIndex++;
          }
          if (parenCount === 0) endIndex++;
          
          const routeDefinition = content.substring(startIndex, Math.min(endIndex + 300, content.length));
          const pathMatch = routeDefinition.match(pattern.pathRegex);
          const routePath = pathMatch ? pathMatch[1] : '/';
          
          const key = `${method}:${routePath}:${relativePath}:${startIndex}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          
          if (!routePath || routePath === '/' || routePath.startsWith('*')) continue;
          
          const lineNumber = content.substring(0, startIndex).split('\n').length;
          const fullPath = this.normalizePath(`${basePath}${routePath}`);
          const permissions = this.extractPermissions(routeDefinition);
          const hasPermissionCheck = permissions.length > 0 || 
            pattern.authCheckRegex.test(routeDefinition) ||
            /(?:requireAuth|requirePermission|checkPermission|hasPermission|authorize)\s*\(/i.test(routeDefinition);
          
          endpoints.push({
            id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            method, path: routePath, fullPath, file: relativePath, line: lineNumber,
            framework, permissions, hasPermissionCheck,
            context: routeDefinition.substring(0, 200).replace(/\s+/g, ' ')
          });
        } catch (err) {}
      }
    }
    return endpoints;
  }
  

  getPatternsForFramework(framework) {
    const commonAuthCheck = /(?:requireAuth|requirePermission|checkPermission|hasPermission|authorize)\s*\(|@(?:UseGuards|Scopes|Roles|Public)/i;
    
    switch (framework) {
      case 'nestjs':
        return [
          { regex: /@\s*(Get|Post|Put|Delete|Patch|Head|Options|All)\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'GET', pathRegex: /['"`]([^'"`]+)['"`]/, authCheckRegex: commonAuthCheck }
        ];
      case 'fastify':
        return [
          { regex: /(?:fastify|app)\s*\.\s*(get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'GET', pathRegex: /['"`]([^'"`]+)['"`]/, authCheckRegex: commonAuthCheck }
        ];
      case 'hapi':
        return [
          { regex: /server\s*\.\s*(route|get|post|put|delete|patch|head|options)\s*\(\s*\{[^}]*path\s*:\s*['"`]([^'"`]+)['"`]/g, method: 'GET', pathRegex: /path\s*:\s*['"`]([^'"`]+)['"`]/, authCheckRegex: /auth\s*:/ }
        ];
      case 'koa':
        return [
          { regex: /router\s*\.\s*(get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'GET', pathRegex: /['"`]([^'"`]+)['"`]/, authCheckRegex: commonAuthCheck }
        ];
      case 'sails':
        return [
          { regex: /_\s*(?:get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'GET', pathRegex: /['"`]([^'"`]+)['"`]/, authCheckRegex: /policy\s*:/ }
        ];
      case 'adonis':
        return [
          { regex: /Route\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi, method: 'GET', pathRegex: /['"`]([^'"`]+)['"`]/, authCheckRegex: /middleware\s*:/ }
        ];
      case 'loopback':
        return [
          { regex: /(?:@)\s*(?:get|post|put|patch|delete|head)\s*\(\s*['"`]([^'"`]+)['"`]?/g, method: 'GET', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: /@auth/ },
          { regex: /RemoteMethod\s*\(\s*\{[\s\S]*?(?:get|post|put|patch|delete)/g, method: 'GET', pathRegex: /name\s*:\s*['"`]([^'"`]+)['"`]/, authCheckRegex: /@auth/ }
        ];
      case 'trpc':
        return [
          { regex: /(?:publicProcedure|protectedProcedure|procedure)\s*\.\s*(?:query|mutation)\s*\(\s*['"`]([^'"`]+)['"`]?\s*,/g, method: 'QRY', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: /middleware\s*:/ },
          { regex: /t\s*\.\s*(?:procedure|router)\s*\.\s*(?:query|mutation)\s*\(\s*['"`]([^'"`]+)['"`]?/g, method: 'QRY', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: /ctx\s*\.user/ }
        ];
      case 'nextjs':
        return [
          { regex: /(?:export\s+(?:async\s+)?)?function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*req\s*,/g, method: 'GET', pathRegex: /^(?:export\s+)?(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/, authCheckRegex: /getServerSideProps|withAuth|authenticated/ },
          { regex: /handler\s*\(\s*req\s*,\s*res\s*\)/g, method: 'GET', pathRegex: /(?:export\s+default|export\s+async\s+function)\s+handler/, authCheckRegex: /getServerSideProps|withAuth/ },
          { regex: /pages\/api\/[\w-]+\//g, method: 'API', pathRegex: /pages\/api\/([\w\-\/]+)/, authCheckRegex: /auth|session|token/ }
        ];
      case 'feathers':
        return [
          { regex: /module\s*\.\s*exports\s*=\s*\{[\s\S]*?service\s*:/g, method: 'SVC', pathRegex: /name\s*:\s*['"`]([^'"`]+)['"`]/, authCheckRegex: /auth\s*:/ },
          { regex: /app\s*\.\s*(?:configure|use|service)\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'SVC', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: /authenticate/ }
        ];
      case 'django':
        return [
          { regex: /@require_(?:login|_permission|csrf_exempt)\s*\n\s*def\s+(\w+)/g, method: 'VIEW', pathRegex: /(?:name\s*=\s*['"`]([^'"`]+)['"`])?/, authCheckRegex: /@require_/ }
        ];
      case 'flask':
        return [
          { regex: /@(?:app|blueprint)\s*\.\s*(route|get|post|put|delete|patch)\s*\(/g, method: 'VIEW', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: /@(?:login_required|permission_required|require_)/ },
          { regex: /@(?:login_required|permission_required)\s*\(/g, method: 'VIEW', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: /@require_/ }
        ];
      case 'spring':
        return [
          { regex: /@(?:Get|Post|Put|Delete|Patch|RequestMapping)\s*\(/g, method: 'GET', pathRegex: /value\s*=\s*['"`]([^\'"`]+)['"`]/, authCheckRegex: /@(?:PreAuthorize|Secured|RolesAllowed)/ }
        ];
      case 'rails':
        return [
          { regex: /(?:get|post|put|patch|delete)\s+['"`]([^\'"`]+)['"`]/g, method: 'GET', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: /before_action\s+:authenticate/ }
        ];
      case 'laravel':
        return [
          { regex: /(?:Route|Route::)(get|post|put|delete|patch|resource)\s*\(/g, method: 'GET', pathRegex: /['"`]([^\'"`]+)['"`]/, authCheckRegex: /middleware\s*:\s*['"`](?:auth|can)/ },
          { regex: /public\s+function\s+(?:get|post|put|delete|patch)(\w+)\s*\(/g, method: 'METHOD', pathRegex: /(\w+)/, authCheckRegex: /middleware\s*:/ }
        ];
      default:
        return [
          { regex: /(?:router|app)\s*\.\s*(get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]?/g, method: 'GET', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: commonAuthCheck },
          { regex: /app\s*\.\s*(?:listen|use)\s*\(/g, method: 'SVR', pathRegex: /listen|use/, authCheckRegex: commonAuthCheck }
        ];
    }
  }

  detectFramework(content, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();
    const dirName = path.basename(path.dirname(filePath)).toLowerCase();
    
    if (/@Controller|@RestController|@Module|@Injectable|@Catch/.test(content)) return 'nestjs';
    if (/fastify\s*\(|fastify\.(get|post|put|delete)/.test(content)) return 'fastify';
    if (/server\s*\.(route|method|handler)|hapi\./.test(content)) return 'hapi';
    if (/koa\s*\(|Router\s*=\s*require\s*\(['"]koa['"]\)/.test(content)) return 'koa';
    if (/@Observable\s*\(|sails\./.test(content)) return 'sails';
    if (/Route\s*\.\s*(get|post|put|patch|delete)/.test(content) && !/express|koa/.test(content)) return 'adonis';
    if (/@model\s*\(|@ObjectType\s*\(/.test(content) && /@property\s*\(/.test(content)) return 'loopback';
    if (/procedure\s*\.\s*(query|mutation)|trpc\./.test(content)) return 'trpc';
    if (/getServerSideProps|pages\/api\//.test(content) || (ext === '.ts' && /res\.status\(200\)/.test(content) && !/router|express/.test(content))) return 'nextjs';
    if (/@loopback\s*-|app\.service\s*\(/.test(content)) return 'loopback';
    if (/app\s*\.(?:configure|service)\s*\(|feathersjs/.test(content)) return 'feathers';
    if (/@app\.route|def\s+\w+\s*\(.*request\)/.test(content)) return 'flask';
    if (/from\s+flask\s+import|@app\s*\./.test(content)) return 'flask';
    if (/@Api|@RestController|from\s+rest_framework/.test(content)) return 'django';
    if (/@RequestMapping|@GetMapping|@PostMapping/.test(content)) return 'spring';
    if (/resources\s*:|match.*controller/.test(content)) return 'rails';
    if (/Route::|use\s+Illuminate/.test(content)) return 'laravel';
    
    if (ext === '.py' && (content.includes('def ') || content.includes('class '))) return 'flask';
    if (ext === '.java') return 'spring';
    if (ext === '.rb') {
      if (/Rails|Rails\./.test(content)) return 'rails';
      if (/Laravel|Route::/.test(content)) return 'laravel';
    }
    if (ext === '.cs') return 'spring';
    
    if (fileName === 'server' || fileName === 'index' || fileName === 'app') {
      if (content.includes('require(') || content.includes('import ')) return 'express';
    }
    if (dirName === 'api' || dirName === 'routes' || dirName === 'controllers') {
      if (content.includes('router') || content.includes('Router')) return 'express';
    }
    
    if (/require\s*\(\s*['"]express['"]\s*\)|from\s+['"]express['"]/.test(content)) return 'express';
    if (/require\s*\(['"]koa['"]\s*\)|import.*from\s+['"]koa['"]/.test(content)) return 'koa';
    if (/router\s*=|module\.exports\s*=\s*Router/.test(content)) return 'express';
    
    return 'express';
  }

  detectBasePath(content, filePath) {
    const prefixMatch = content.match(/router\s*\.\s*prefix\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (prefixMatch) return prefixMatch[1];
    const fileName = path.basename(filePath, path.extname(filePath));
    if (fileName !== 'index' && fileName !== 'server' && fileName !== 'routes') {
      return `/${fileName}`;
    }
    return '';
  }

  normalizePath(p) {
    return p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  extractPermissions(routeDefinition) {
    const permissions = [];
    
    const permConstants = routeDefinition.match(/PERMISSIONS\.([A-Z0-9_]+)/gi);
    if (permConstants) {
      permConstants.forEach(p => {
        const constName = p.split('.')[1].toUpperCase();
        const resolved = this.constants[constName] || constName.toLowerCase().replace(/_/g, '.');
        if (!permissions.includes(resolved)) {
          permissions.push(resolved);
        }
      });
    }
    
    const directPerms = routeDefinition.match(/requirePermission\s*\(\s*['"`]([^'"`]+)['"`]/gi);
    if (directPerms) {
      directPerms.forEach(p => {
        const match = p.match(/['"`]([^'"`]+)['"`]/);
        if (match) {
          const perm = match[1].replace(/['"`]/g, '');
          if (!perm.startsWith('PERMISSIONS') && !permissions.includes(perm)) {
            permissions.push(perm);
          }
        }
      });
    }
    
    return permissions;
  }

  generateSummary() {
    const methods = {}, permissionCoverage = { withPermissions: 0, withoutPermissions: 0 };
    for (const ep of this.endpoints) {
      methods[ep.method] = (methods[ep.method] || 0) + 1;
      if (ep.hasPermissionCheck) permissionCoverage.withPermissions++;
      else permissionCoverage.withoutPermissions++;
    }
    return {
      totalEndpoints: this.endpoints.length,
      totalFiles: this.discoveredFiles.length,
      methods,
      permissionCoverage,
      frameworks: [...new Set(this.endpoints.map(ep => ep.framework))],
      uniquePermissions: [...new Set(this.endpoints.flatMap(ep => ep.permissions))]
    };
  }

  async exportResults(outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      endpoints: this.endpoints,
      errors: this.errors,
      summary: this.generateSummary()
    }, null, 2));
    return outputPath;
  }
}

// ============================================
// Context Engine (embedded) - Uses actual SQLite database
// ============================================
class ContextEngine {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.roles = [];
    this.permissions = [];
    this.rolePermissions = [];
    this.permissionMap = null;
    this.endpoints = [];
    this.db = null;
    this.usingDatabase = false;
  }

  loadConfig() {
    const configPath = path.join(getAppPath(), 'mapper.config.json');
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.database?.connection?.filename;
      }
    } catch (e) {
      console.log('[Context Engine] Could not load mapper.config.json');
    }
    return null;
  }

  async initializeDatabase() {
    const configDbPath = this.loadConfig();
    const dbPath = this.dbPath || configDbPath;
    
    if (!dbPath) {
      console.log('[Context Engine] No database path configured. Running without role/permission mapping.');
      return;
    }
    
    const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(getAppPath(), dbPath);
    
    if (!fs.existsSync(resolvedDbPath)) {
      console.log('[Context Engine] Database file not found. Running without role/permission mapping.');
      return;
    }
    
    try {
      const initSqlJs = require('sql.js');
      const SQL = await initSqlJs();
      
      console.log('[Context Engine] Loading database from:', resolvedDbPath);
      const buffer = fs.readFileSync(resolvedDbPath);
      this.db = new SQL.Database(buffer);
      this.usingDatabase = true;
      
      // Load roles
      try {
        const rolesResult = this.db.exec('SELECT * FROM roles');
        if (rolesResult.length > 0) {
          this.roles = rolesResult[0].values.map(row => ({
            id: row[0],
            name: row[1],
            description: row[2] || '',
            level: row[3] || 0
          }));
        }
      } catch (e) {
        console.log('[Context Engine] No roles table found');
      }
      
      // Load permissions
      try {
        const permsResult = this.db.exec('SELECT * FROM permissions');
        if (permsResult.length > 0) {
          this.permissions = permsResult[0].values.map(row => ({
            id: row[0]?.toString() || '',
            key: row[1] || '',
            name: row[2] || row[1] || '',
            description: row[3] || '',
            category: (row[1] || '').split('.')[0] || 'general'
          }));
        }
      } catch (e) {
        console.log('[Context Engine] No permissions table found, deriving from role_permissions');
      }
      
      // Load role-permission mappings
      try {
        const rpQueries = [
          'SELECT * FROM role_permissions',
          'SELECT * FROM role_permission',
          'SELECT * FROM rolepermissions',
          'SELECT role_id, permission FROM role_permissions'
        ];
        
        for (const query of rpQueries) {
          try {
            const rpResult = this.db.exec(query);
            if (rpResult.length > 0) {
              this.rolePermissions = rpResult[0].values.map(row => ({
                roleId: row[0],
                permissionKey: row[1] || row[2] || ''
              })).filter(rp => rp.permissionKey);
              break;
            }
          } catch (e) {}
        }
        
        if (this.permissions.length === 0 && this.rolePermissions.length > 0) {
          const uniquePerms = [...new Set(this.rolePermissions.map(rp => rp.permissionKey))];
          this.permissions = uniquePerms.map((key, idx) => ({
            id: `perm_${idx}`,
            key: key,
            name: key,
            category: key.split('.')[0] || 'general'
          }));
        }
      } catch (e) {
        console.log('[Context Engine] Could not load role_permissions:', e.message);
      }
      
      console.log(`[Context Engine] Loaded ${this.roles.length} roles, ${this.permissions.length} permissions, ${this.rolePermissions.length} mappings`);
      
      if (this.roles.length === 0) {
        console.log('[Context Engine] Database exists but no roles found. Running without role/permission mapping.');
      }
    } catch (error) {
      console.log('[Context Engine] Could not load database:', error.message);
      console.log('[Context Engine] Running without role/permission mapping.');
    }
  }

  async loadScanResults(scanResultsPath) {
    const data = JSON.parse(fs.readFileSync(path.resolve(scanResultsPath), 'utf8'));
    this.endpoints = data.endpoints || [];
    return this.endpoints;
  }

  buildPermissionMap() {
    const permissionMatrix = [], unprotectedEndpoints = [];
    
    for (const endpoint of this.endpoints) {
      const accessibleRoles = [];
      const requiredPermissions = endpoint.permissions || [];
      
      if (requiredPermissions.length === 0) {
        unprotectedEndpoints.push({
          endpointId: endpoint.id, method: endpoint.method,
          path: endpoint.path, file: endpoint.file, line: endpoint.line
        });
        continue;
      }
      
      for (const role of this.roles) {
        const rolePerms = this.getRolePermissions(role.id);
        if (this.checkAccess(requiredPermissions, rolePerms)) {
          accessibleRoles.push({
            roleId: role.id, roleName: role.name,
            viaPermissions: this.getMatchingPermissions(requiredPermissions, rolePerms)
          });
        }
      }
      
      permissionMatrix.push({
        endpointId: endpoint.id, method: endpoint.method,
        path: endpoint.path, fullPath: endpoint.fullPath,
        file: endpoint.file, line: endpoint.line,
        requiredPermissions, accessibleRoles,
        accessibleRoleCount: accessibleRoles.length,
        riskLevel: this.calculateRiskLevel(endpoint, accessibleRoles.length)
      });
    }
    
    const usedPermissions = new Set(this.endpoints.flatMap(ep => ep.permissions));
    const orphanPermissions = this.permissions.filter(p => !usedPermissions.has(p.key));
    
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
    
    return this.permissionMap;
  }

  getRolePermissions(roleId) {
    const directPermissions = this.rolePermissions.filter(rp => rp.roleId === roleId).map(rp => rp.permissionKey).filter(Boolean);
    const allPermissions = new Set(directPermissions);
    for (const perm of directPermissions) {
      if (perm.endsWith('.*')) {
        const prefix = perm.slice(0, -2);
        this.permissions.filter(p => p.key.startsWith(prefix + '.')).forEach(p => allPermissions.add(p.key));
      }
    }
    return [...allPermissions];
  }

  checkAccess(requiredPermissions, rolePermissions) {
    if (requiredPermissions.length === 0) return true;
    if (rolePermissions.some(p => p === 'admin.*' || p === '*')) return true;
    return requiredPermissions.every(req => rolePermissions.some(rolePerm => rolePerm === req || rolePerm === '*'));
  }

  getMatchingPermissions(requiredPermissions, rolePermissions) {
    const matches = [];
    for (const req of requiredPermissions) {
      for (const rolePerm of rolePermissions) {
        if (rolePerm === req || rolePerm === 'admin.*' || rolePerm === '*') {
          matches.push(rolePerm);
        }
      }
    }
    return [...new Set(matches)];
  }

  calculateRiskLevel(endpoint, accessibleRoleCount) {
    const sensitiveMethods = ['DELETE', 'PUT', 'PATCH'];
    if (!endpoint.hasPermissionCheck) return 'critical';
    if (sensitiveMethods.includes(endpoint.method) && accessibleRoleCount > 3) return 'high';
    if (accessibleRoleCount > 5) return 'medium';
    return 'low';
  }

  generateAuditReport() {
    const issues = [];
    
    for (const ep of this.permissionMap.unprotectedEndpoints) {
      issues.push({
        severity: 'critical', type: 'unprotected_endpoint',
        message: `Endpoint ${ep.method} ${ep.path} has no permission check`,
        recommendation: 'Add appropriate permission check middleware'
      });
    }
    
    for (const item of this.permissionMap.permissionMatrix) {
      if (item.accessibleRoleCount > 5) {
        issues.push({
          severity: 'high', type: 'overprivileged',
          message: `Endpoint ${item.method} ${item.path} is accessible by ${item.accessibleRoleCount} roles`,
          recommendation: 'Review and restrict permissions'
        });
      }
    }
    
    for (const perm of this.permissionMap.orphanPermissions) {
      issues.push({
        severity: 'medium', type: 'orphan_permission',
        message: `Permission '${perm.key}' is not used by any endpoint`,
        recommendation: 'Remove unused permission or implement corresponding endpoint'
      });
    }
    
    return {
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
  }

  async exportPermissionMap(outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(this.permissionMap, null, 2));
    return outputPath;
  }

  async exportAuditReport(outputPath) {
    const report = this.generateAuditReport();
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    return outputPath;
  }
}

// ============================================
// Electron Window Management
// ============================================
let mainWindow;

function createWindow() {
  const indexPath = path.join(getDistPath(), 'index.html');
  const iconPath = path.join(getAppPath(), 'build', 'icon.ico');
  
  console.log('[Permission Mapper] Loading:', indexPath);
  
  const windowOptions = {
    width: 1400, height: 900, minWidth: 1024, minHeight: 700,
    title: 'Permission Mapper',
    backgroundColor: '#0f172a',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  };

  mainWindow = new BrowserWindow(windowOptions);

  // Disable menu bar completely
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  if (fs.existsSync(indexPath)) {
    mainWindow.loadFile(indexPath);
  } else {
    dialog.showErrorBox('Error', `Could not find index.html at ${indexPath}`);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  console.log('[Permission Mapper] Window created!');
}

// ============================================
// IPC Handlers
// ============================================
let currentDbPath = null;

const ensureArtifactsDir = () => {
  const artifactsPath = path.join(app.getPath('userData'), 'artifacts');
  if (!fs.existsSync(artifactsPath)) fs.mkdirSync(artifactsPath, { recursive: true });
  return artifactsPath;
};

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Backend Source Directory'
  });
  if (result.canceled) return { success: false, canceled: true };
  return { success: true, path: result.filePaths[0] };
});

ipcMain.handle('select-database', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select Database',
    filters: [
      { name: 'SQLite Database', extensions: ['sqlite', 'db', 'data'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled) return { success: false, canceled: true };
  currentDbPath = result.filePaths[0];
  console.log('[App] Database path set to:', currentDbPath);
  return { success: true, path: currentDbPath };
});

ipcMain.handle('run-full-analysis', async (event, sourceDir) => {
  try {
    console.log(`[Full Analysis] Starting scan of: ${sourceDir}`);
    console.log(`[Full Analysis] Using database: ${currentDbPath || 'default path'}`);
    mainWindow.webContents.send('analysis-progress', { phase: 'scanning', progress: 0 });
    
    const scanner = new PermissionScanner();
    const scanResults = await scanner.scanDirectory(sourceDir);
    console.log(`[Scanner] Found ${scanResults.summary.totalEndpoints} endpoints`);
    
    const scanOutputPath = path.join(ensureArtifactsDir(), 'scan_results.json');
    await scanner.exportResults(scanOutputPath);
    mainWindow.webContents.send('analysis-progress', { phase: 'scanning', progress: 100 });
    mainWindow.webContents.send('analysis-progress', { phase: 'mapping', progress: 0 });
    
    const engine = new ContextEngine(currentDbPath);
    await engine.initializeDatabase();
    await engine.loadScanResults(scanOutputPath);
    engine.buildPermissionMap();
    
    const permissionMapPath = path.join(ensureArtifactsDir(), 'permissions_map.json');
    const auditReportPath = path.join(ensureArtifactsDir(), 'audit_report.json');
    await engine.exportPermissionMap(permissionMapPath);
    await engine.exportAuditReport(auditReportPath);
    
    mainWindow.webContents.send('analysis-progress', { phase: 'mapping', progress: 100 });
    mainWindow.webContents.send('analysis-progress', { phase: 'complete', progress: 100 });
    
    console.log(`[Full Analysis] Complete!`);
    console.log(`[Full Analysis] Roles: ${engine.roles.length}, Permissions: ${engine.permissions.length}`);
    
    return { success: true, scanResults, permissionMap: engine.permissionMap };
  } catch (error) {
    console.error('[Full Analysis] Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-permission-map', async () => {
  try {
    const mapPath = path.join(ensureArtifactsDir(), 'permissions_map.json');
    if (!fs.existsSync(mapPath)) return { success: false, error: 'Permission map not found. Run a scan first.' };
    const data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-audit-report', async () => {
  try {
    const reportPath = path.join(ensureArtifactsDir(), 'audit_report.json');
    if (!fs.existsSync(reportPath)) return { success: false, error: 'Audit report not found.' };
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-artifacts-path', () => ensureArtifactsDir());

ipcMain.handle('export-data', async (event, data, defaultFilename) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Data',
      defaultPath: defaultFilename || 'permission-data.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (result.canceled) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return { success: true, path: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-config', async () => ({ success: true, config: null }));
ipcMain.handle('update-db-path', async () => ({ success: true }));

// ============================================
// App Lifecycle
// ============================================
app.whenReady().then(() => {
  console.log('[Permission Mapper] App ready!');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

console.log('[Permission Mapper] Electron main process loaded');
