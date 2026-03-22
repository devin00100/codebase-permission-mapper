#!/usr/bin/env node

/**
 * Codebase Permission Mapper - Main Entry Point
 * 
 * Usage:
 *   node index.js scan <source-dir> [--config <path>]
 *   node index.js map [--scan-results <path>] [--config <path>]
 *   node index.js full <source-dir> [--config <path>]
 *   node index.js dashboard
 */

const { PermissionScanner } = require('./scanner');
const { ContextEngine } = require('./context-engine');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
Codebase Permission Mapper

Usage:
  node index.js scan <source-dir> [options]     Scan codebase for endpoints
  node index.js map [options]                   Build permission map from scan results
  node index.js full <source-dir> [options]     Scan + Map in one command
  node index.js dashboard                       Launch the web dashboard
  node index.js help                            Show this help message

Options:
  --config <path>          Path to mapper.config.json (default: ./mapper.config.json)
  --scan-results <path>    Path to scan results JSON (default: ./artifacts/scan_results.json)
  --output <dir>           Output directory for artifacts (default: ./artifacts)

Examples:
  node index.js scan ./src
  node index.js scan ./src --config ./config/mapper.json
  node index.js map --scan-results ./results/scan.json
  node index.js full ./src
  node index.js dashboard
`);
}

function parseArgs(args) {
  const options = {
    config: './mapper.config.json',
    scanResults: './artifacts/scan_results.json',
    output: './artifacts'
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      options.config = args[i + 1];
      i++;
    } else if (args[i] === '--scan-results' && args[i + 1]) {
      options.scanResults = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    }
  }
  
  return options;
}

async function scanCommand() {
  const sourceDir = args[1];
  if (!sourceDir) {
    console.error('Error: Source directory is required');
    console.log('Usage: node index.js scan <source-dir>');
    process.exit(1);
  }
  
  const options = parseArgs(args.slice(2));
  
  console.log('🔍 Starting codebase scan...');
  console.log(`   Source: ${sourceDir}`);
  console.log(`   Config: ${options.config}`);
  
  try {
    const scanner = new PermissionScanner(options.config);
    const results = await scanner.scanDirectory(sourceDir);
    
    const outputPath = path.join(options.output, 'scan_results.json');
    await scanner.exportResults(outputPath);
    
    console.log('\n✅ Scan completed successfully!');
    console.log(`   Endpoints found: ${results.summary.totalEndpoints}`);
    console.log(`   Files scanned: ${results.summary.totalFiles}`);
    console.log(`   Output: ${outputPath}`);
  } catch (error) {
    console.error('❌ Scan failed:', error.message);
    process.exit(1);
  }
}

async function mapCommand() {
  const options = parseArgs(args.slice(1));
  
  console.log('🏗️  Building permission map...');
  console.log(`   Scan results: ${options.scanResults}`);
  console.log(`   Config: ${options.config}`);
  
  try {
    const engine = new ContextEngine(options.config);
    await engine.initializeDatabase();
    await engine.loadScanResults(options.scanResults);
    
    engine.buildPermissionMap();
    
    const permissionMapPath = path.join(options.output, 'permissions_map.json');
    const auditReportPath = path.join(options.output, 'audit_report.json');
    const documentationPath = path.join(options.output, 'PERMISSIONS.md');
    
    await engine.exportPermissionMap(permissionMapPath);
    await engine.exportAuditReport(auditReportPath);
    await engine.generateDocumentation(documentationPath);
    
    console.log('\n✅ Permission map built successfully!');
    console.log(`   Permission Map: ${permissionMapPath}`);
    console.log(`   Audit Report: ${auditReportPath}`);
    console.log(`   Documentation: ${documentationPath}`);
  } catch (error) {
    console.error('❌ Mapping failed:', error.message);
    process.exit(1);
  }
}

async function fullCommand() {
  const sourceDir = args[1];
  if (!sourceDir) {
    console.error('Error: Source directory is required');
    console.log('Usage: node index.js full <source-dir>');
    process.exit(1);
  }
  
  const options = parseArgs(args.slice(2));
  
  // Scan
  console.log('🔍 Phase 1: Scanning codebase...\n');
  
  try {
    const scanner = new PermissionScanner(options.config);
    await scanner.scanDirectory(sourceDir);
    
    const scanOutputPath = path.join(options.output, 'scan_results.json');
    await scanner.exportResults(scanOutputPath);
    
    // Map
    console.log('\n🏗️  Phase 2: Building permission map...\n');
    
    const engine = new ContextEngine(options.config);
    await engine.initializeDatabase();
    await engine.loadScanResults(scanOutputPath);
    
    engine.buildPermissionMap();
    
    const permissionMapPath = path.join(options.output, 'permissions_map.json');
    const auditReportPath = path.join(options.output, 'audit_report.json');
    const documentationPath = path.join(options.output, 'PERMISSIONS.md');
    
    await engine.exportPermissionMap(permissionMapPath);
    await engine.exportAuditReport(auditReportPath);
    await engine.generateDocumentation(documentationPath);
    
    console.log('\n✅ Full analysis completed successfully!');
    console.log('\nArtifacts generated:');
    console.log(`   📄 ${scanOutputPath}`);
    console.log(`   📄 ${permissionMapPath}`);
    console.log(`   📄 ${auditReportPath}`);
    console.log(`   📄 ${documentationPath}`);
    
    console.log('\nNext steps:');
    console.log('   1. Review the audit report for security issues');
    console.log('   2. Launch the dashboard: node index.js dashboard');
    console.log('   3. Check PERMISSIONS.md for documentation');
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

function dashboardCommand() {
  console.log('🚀 Launching dashboard...');
  
  const { exec } = require('child_process');
  const dashboardPath = path.join(__dirname, 'visualizer');
  
  if (!fs.existsSync(dashboardPath)) {
    console.error('❌ Dashboard not found. Please run npm install first.');
    process.exit(1);
  }
  
  console.log(`   Dashboard path: ${dashboardPath}`);
  console.log('   Starting development server...\n');
  
  const child = exec('npm run dev', { cwd: dashboardPath });
  
  child.stdout.on('data', (data) => {
    console.log(data);
  });
  
  child.stderr.on('data', (data) => {
    console.error(data);
  });
  
  child.on('close', (code) => {
    console.log(`Dashboard process exited with code ${code}`);
  });
}

// Main command dispatcher
switch (command) {
  case 'scan':
    scanCommand();
    break;
  case 'map':
    mapCommand();
    break;
  case 'full':
    fullCommand();
    break;
  case 'dashboard':
    dashboardCommand();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log('Codebase Permission Mapper\n');
    console.log('Use "node index.js help" for usage information\n');
    
    if (!command) {
      console.log('Quick start:');
      console.log('   node index.js scan ./src');
      console.log('   node index.js map');
      console.log('   node index.js dashboard');
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
}
