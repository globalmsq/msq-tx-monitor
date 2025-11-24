#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Patterns for relative imports that need .js extension
const IMPORT_PATTERNS = [
  // import ... from './path' or '../path'
  /from\s+['"](\.[^'"]+)['"]/g,
  // export ... from './path' or '../path'
  /export\s+.*from\s+['"](\.[^'"]+)['"]/g,
];

function needsJsExtension(importPath) {
  // Skip if already has an extension
  if (importPath.match(/\.(js|mjs|cjs|json|ts|tsx|mts|cts)$/)) {
    return false;
  }
  // Add .js extension to relative imports
  return true;
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  IMPORT_PATTERNS.forEach(pattern => {
    content = content.replace(pattern, (match, importPath) => {
      if (needsJsExtension(importPath)) {
        modified = true;
        return match.replace(importPath, `${importPath}.js`);
      }
      return match;
    });
  });

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  return false;
}

function getAllTsFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function main() {
  const targetDirs = [
    join(__dirname, 'apps/chain-scanner/src'),
    join(__dirname, 'apps/tx-api/src'),
    join(__dirname, 'apps/tx-analyzer/src'),
  ];

  let totalUpdated = 0;

  for (const dir of targetDirs) {
    console.log(`\nProcessing ${dir}...`);
    const files = getAllTsFiles(dir);

    console.log(`Found ${files.length} TypeScript files`);

    for (const file of files) {
      if (processFile(file)) {
        totalUpdated++;
      }
    }
  }

  console.log(`\n🎉 Done! Updated ${totalUpdated} files.`);
}

main();
