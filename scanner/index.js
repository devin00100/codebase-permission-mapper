#!/usr/bin/env node

/**
 * Permission Scanner - Extracts endpoints from backend source code
 * Supports: Express, NestJS, Fastify, Hapi, Koa, Sails, Adonis, LoopBack, tRPC, Next.js, Feathers
 */

const fs = require('fs');
const path = require('path');

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
        const configData = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}. Using defaults.`);
    }
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
    console.log(`[Scanner] Scanning directory: ${sourceDir}`);
    this.endpoints = [];
    this.discoveredFiles = [];
    this.errors = [];
    this.sourceDir = path.resolve(sourceDir);

    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory does not exist: ${this.sourceDir}`);
    }

    await this.loadConstants();
    await this.walkDirectory(this.sourceDir);
    
    console.log(`[Scanner] Discovered ${this.discoveredFiles.length} files`);
    console.log(`[Scanner] Found ${this.endpoints.length} endpoints`);
    if (Object.keys(this.constants).length > 0) {
      console.log(`[Scanner] Loaded ${Object.keys(this.constants).length} permission constants`);
    }
    
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
      path.join(this.sourceDir, 'constants', 'permissions.js'),
      path.join(this.sourceDir, '..', 'auth', 'rbac.js'),
    ];

    for (const rbacPath of searchPaths) {
      if (fs.existsSync(rbacPath)) {
        try {
          const content = fs.readFileSync(rbacPath, 'utf8');
          
          const patterns = [
            /export\s+const\s+PERMISSIONS\s*=\s*Object\.freeze\s*\(\s*\{([\s\S]*?)\}\s*\)/,
            /export\s+const\s+PERMISSIONS\s*=\s*\{([\s\S]*?)\}/,
            /const\s+PERMISSIONS\s*=\s*\{([\s\S]*?)\}/,
            /export\s+(?:const|let|var)\s+(\w+)\s*=\s*(?:Object\.)?freeze\s*\(\s*\{([\s\S]*?)\}\s*\)/,
          ];
          
          for (const pattern of patterns) {
            const permMatch = content.match(pattern);
            if (permMatch) {
              const entriesStr = permMatch[permMatch.length - 1];
              const entries = entriesStr.split(',').filter(line => {
                const trimmed = line.trim();
                return trimmed.includes(':') || trimmed.includes('=');
              });
              entries.forEach(entry => {
                const parts = entry.split(/[:=]/).map(s => s.trim().replace(/['"`,\n]/g, ''));
                if (parts.length >= 2 && parts[0] && parts[1]) {
                  this.constants[parts[0].toUpperCase()] = parts[1];
                }
              });
              console.log(`[Scanner] Loaded constants from ${path.basename(rbacPath)}`);
              return;
            }
          }
        } catch (err) {
          console.warn(`[Scanner] Could not load constants from ${rbacPath}: ${err.message}`);
        }
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
      } catch (err) {
        console.warn(`[Scanner] Error accessing ${path.join(dir, entry)}: ${err.message}`);
      }
    }
  }

  shouldExclude(dirName) {
    const excludePatterns = this.config.scanner?.excludePatterns || ['node_modules', 'dist', 'build', '.git'];
    return excludePatterns.some(pattern => 
      dirName.includes(pattern) || (pattern.startsWith('.') && dirName.startsWith('.'))
    );
  }

  shouldIncludeFile(fileName) {
    const extensions = this.config.scanner?.fileExtensions || ['.js', '.ts', '.jsx', '.tsx'];
    return extensions.some(ext => fileName.endsWith(ext));
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      this.discoveredFiles.push(relativePath);
      
      const framework = this.detectFramework(content, filePath);
      const endpoints = this.extractEndpoints(content, filePath, relativePath, framework);
      
      this.endpoints.push(...endpoints);
    } catch (error) {
      this.errors.push({ file: filePath, error: error.message });
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
    if (/sails\./.test(content)) return 'sails';
    if (/Route\s*\.\s*(get|post|put|patch|delete)/.test(content) && !/express|koa/.test(content)) return 'adonis';
    if (/@model\s*\(|@ObjectType\s*\(|loopback\./.test(content)) return 'loopback';
    if (/procedure\s*\.(query|mutation)|trpc\./.test(content)) return 'trpc';
    if (/getServerSideProps|pages\/api\//.test(content)) return 'nextjs';
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
    
    if (/require\s*\(\s*['"]express['"]\s*\)|from\s+['"]express['"]/.test(content)) return 'express';
    if (/require\s*\(['"]koa['"]\s*\)|import.*from\s+['"]koa['"]/.test(content)) return 'koa';
    if (/router\s*=|module\.exports\s*=\s*Router/.test(content)) return 'express';
    
    if (fileName === 'server' || fileName === 'index' || fileName === 'app') {
      if (content.includes('require(') || content.includes('import ')) return 'express';
    }
    if (dirName === 'api' || dirName === 'routes' || dirName === 'controllers') {
      if (content.includes('router') || content.includes('Router')) return 'express';
    }
    
    return this.config.scanner?.framework || 'express';
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
          { regex: /@\s*(?:get|post|put|patch|delete|head)\s*\(\s*['"`]([^'"`]+)['"`]/g, method: 'GET', pathRegex: /['"`]([^'"`]+)['"`]/, authCheckRegex: /@auth/ }
        ];
      case 'trpc':
        return [
          { regex: /(?:publicProcedure|protectedProcedure|procedure)\s*\.\s*(?:query|mutation)\s*\(\s*['"`]([^'"`]+)['"`]?\s*,/g, method: 'QRY', pathRegex: /['"`]([^'"`]+)['"`]/, authCheckRegex: /middleware\s*:/ }
        ];
      case 'nextjs':
        return [
          { regex: /(?:export\s+(?:async\s+)?)?function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(\s*req\s*,/g, method: 'GET', pathRegex: /^(?:export\s+)?(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/, authCheckRegex: /getServerSideProps|withAuth|authenticated/ },
          { regex: /handler\s*\(\s*req\s*,\s*res\s*\)/g, method: 'GET', pathRegex: /(?:export\s+default|export\s+async\s+function)\s+handler/, authCheckRegex: /getServerSideProps|withAuth/ }
        ];
      case 'feathers':
        return [
          { regex: /module\s*\.\s*exports\s*=\s*\{[\s\S]*?service\s*:/g, method: 'SVC', pathRegex: /name\s*:\s*['"`]([^'"`]+)['"`]/, authCheckRegex: /auth\s*:/ }
        ];
      default:
        return [
          { regex: /(?:router|app)\s*\.\s*(get|post|put|delete|patch|head|options)\s*\(\s*['"`]([^'"`]+)['"`]?/g, method: 'GET', pathRegex: /['"`]([^\'"`\n]+)['"`]/, authCheckRegex: commonAuthCheck }
        ];
    }
  }

  extractEndpoints(content, filePath, relativePath, framework) {
    const endpoints = [];
    const seenKeys = new Set();
    const patterns = this.getPatternsForFramework(framework);
    
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
          const basePath = this.detectBasePath(content, filePath);
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

  detectBasePath(content, filePath) {
    const prefixMatch = content.match(/router\s*\.\s*prefix\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (prefixMatch) return prefixMatch[1];
    
    const useMatch = content.match(/app\s*\.\s*use\s*\(\s*['"`]([^'"`]+)['"`]\s*,/);
    if (useMatch) return useMatch[1];
    
    const fileName = path.basename(filePath, path.extname(filePath));
    if (fileName !== 'index' && fileName !== 'server' && fileName !== 'routes' && fileName !== 'app') {
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
    
    const checkPerms = routeDefinition.match(/checkPermission\s*\(\s*['"`]([^'"`]+)['"`]/gi);
    if (checkPerms) {
      checkPerms.forEach(p => {
        const match = p.match(/['"`]([^'"`]+)['"`]/);
        if (match && !permissions.includes(match[1])) {
          permissions.push(match[1]);
        }
      });
    }
    
    const hasPerms = routeDefinition.match(/hasPermission\s*\(\s*['"`]([^'"`]+)['"`]/gi);
    if (hasPerms) {
      hasPerms.forEach(p => {
        const match = p.match(/['"`]([^'"`]+)['"`]/);
        if (match && !permissions.includes(match[1])) {
          permissions.push(match[1]);
        }
      });
    }
    
    return permissions;
  }

  generateSummary() {
    const methods = {};
    const permissionCoverage = { withPermissions: 0, withoutPermissions: 0 };
    
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
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const output = {
      generatedAt: new Date().toISOString(),
      endpoints: this.endpoints,
      errors: this.errors,
      summary: this.generateSummary()
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`[Scanner] Results exported to: ${outputPath}`);
    
    return outputPath;
  }
}

module.exports = { PermissionScanner };

if (require.main === module) {
  const args = process.argv.slice(2);
  const sourceDir = args[0] || './src';
  const outputPath = args[1] || './artifacts/scan_results.json';
  
  const scanner = new PermissionScanner();
  scanner.scanDirectory(sourceDir)
    .then(async (results) => {
      console.log('\n[Scanner] Summary:');
      console.log(`  Total Endpoints: ${results.summary.totalEndpoints}`);
      console.log(`  Total Files: ${results.summary.totalFiles}`);
      console.log(`  Frameworks: ${results.summary.frameworks.join(', ') || 'none detected'}`);
      console.log(`  Methods: ${JSON.stringify(results.summary.methods)}`);
      console.log(`  With Permissions: ${results.summary.permissionCoverage.withPermissions}`);
      console.log(`  Without Permissions: ${results.summary.permissionCoverage.withoutPermissions}`);
      
      await scanner.exportResults(outputPath);
    })
    .catch(err => {
      console.error('[Scanner] Error:', err.message);
      process.exit(1);
    });
}
