/**
 * Creates backend-deploy-catalyst.zip with node_modules
 * for Zoho Catalyst AppSail deployment.
 * Run: node scripts/make-deploy-zip.cjs
 */
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const BACKEND_DIR = path.resolve(__dirname, '..');
const OUTPUT_ZIP = path.resolve(BACKEND_DIR, '..', 'backend-deploy-catalyst.zip');

// Top-level dirs/files to exclude
const EXCLUDE_TOP_DIRS = new Set(['uploads', 'deleted', 'cache', '.git', '.next']);
const EXCLUDE_FILES = new Set([
  '.env',
  'backend-deploy-catalyst.zip',
  'backend-clean-catalyst.zip',
  'node_modules_working.zip',
  'catalyst-debug.log',
]);

if (fs.existsSync(OUTPUT_ZIP)) {
  fs.unlinkSync(OUTPUT_ZIP);
  console.log('Removed existing zip.');
}

const zip = new AdmZip();
let fileCount = 0;

// Walk BACKEND_DIR, filter, add to archive
function walkDir(dirPath, relPrefix) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    console.warn(`Cannot read dir: ${dirPath} — ${e.message}`);
    return;
  }

  for (const entry of entries) {
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const topDir = rel.split('/')[0];

    // Skip excluded top-level directories
    if (EXCLUDE_TOP_DIRS.has(topDir)) continue;
    // Skip excluded file names
    if (EXCLUDE_FILES.has(entry.name)) continue;
    // Skip .log files
    if (entry.name.endsWith('.log')) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, rel);
    } else if (entry.isFile()) {
      try {
        // adm-zip: addLocalFile(localPath, zipPath, zipName)
        // zipPath = directory inside zip (e.g. "src/controllers")
        const zipDir = relPrefix || '';
        zip.addLocalFile(fullPath, zipDir, entry.name);
        fileCount++;
        if (fileCount % 1000 === 0) process.stdout.write(`  ${fileCount} files added...\r`);
      } catch (e) {
        console.warn(`Skipped: ${rel} — ${e.message}`);
      }
    }
  }
}

console.log(`Building zip from ${BACKEND_DIR}...`);
walkDir(BACKEND_DIR, '');

console.log(`\nWriting zip (${fileCount} files)...`);
zip.writeZip(OUTPUT_ZIP);

const size = fs.statSync(OUTPUT_ZIP).size;
console.log(`Done! ${fileCount} files, ${(size/1024/1024).toFixed(1)} MB → ${OUTPUT_ZIP}`);
