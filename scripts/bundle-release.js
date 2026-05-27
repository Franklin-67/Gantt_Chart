/**
 * bundle-release.js — Downloads Neutralino runtime, runs neu build, assembles release.
 *
 * Output: release/gantt-chart/ (~1.2 MB)
 * Command: node scripts/bundle-release.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RELEASE = path.join(ROOT, 'release');
const BIN = path.join(ROOT, 'bin');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'neutralino.config.json'), 'utf-8'));
const BINARY_NAME = CONFIG.cli?.binaryName || 'gantt-chart';

const ZIP_URL = 'https://github.com/neutralinojs/neutralinojs/releases/latest/download/neutralinojs-v6.7.0.zip';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  (cached) ${path.basename(dest)}`);
      return resolve();
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let redirects = 0;
    function attempt(currentUrl) {
      if (redirects++ > 5) return reject(new Error('Too many redirects'));
      const file = fs.createWriteStream(dest);
      https.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          attempt(res.headers.location);
        } else if (res.statusCode >= 400) {
          file.close();
          try { fs.unlinkSync(dest); } catch {}
          reject(new Error(`HTTP ${res.statusCode}`));
        } else {
          res.pipe(file);
          file.on('finish', () => {
            console.log(`  downloaded ${path.basename(dest)} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
            resolve();
          });
          file.on('error', reject);
        }
      }).on('error', reject);
    }
    attempt(url);
  });
}

async function main() {
  console.log('\n=== Building Neutralino release ===\n');

  // Step 1: Download & extract runtime to bin/
  if (!fs.existsSync(BIN)) fs.mkdirSync(BIN);

  const neededFiles = ['neutralino-win_x64.exe'];
  const allCached = neededFiles.every(f => fs.existsSync(path.join(BIN, f)));

  if (!allCached) {
    const tmpDir = path.join(ROOT, '.neu-tmp');
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    const zipPath = path.join(tmpDir, 'binaries.zip');
    console.log('Downloading Neutralino runtime zip...');
    await download(ZIP_URL, zipPath);

    console.log('Extracting...');
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpDir}' -Force"`, { stdio: 'pipe' });

    // Find needed files in extracted tree
    for (const f of neededFiles) {
      const found = findFile(tmpDir, f);
      if (!found) throw new Error(`Could not find ${f} in extracted zip`);
      fs.copyFileSync(found, path.join(BIN, f));
      const sz = fs.statSync(path.join(BIN, f)).size;
      console.log(`  ${f} (${(sz / 1024).toFixed(0)} KB)`);
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  } else {
    console.log('Runtime binaries (cached):');
    for (const f of neededFiles) {
      console.log(`  ${f} (${(fs.statSync(path.join(BIN, f)).size / 1024).toFixed(0)} KB)`);
    }
  }

  // Verify PE headers
  for (const f of neededFiles) {
    const fp = path.join(BIN, f);
    const hdr = Buffer.alloc(2);
    const fd = fs.openSync(fp, 'r');
    fs.readSync(fd, hdr, 0, 2, 0);
    fs.closeSync(fd);
    if (hdr[0] !== 0x4D || hdr[1] !== 0x5A) {
      fs.unlinkSync(fp);
      throw new Error(`${f} is not a valid PE file — deleted. Please retry.`);
    }
  }

  // Step 2: Run neu build
  console.log('\nRunning neu build --release...');
  execSync('"' + path.join(ROOT, 'node_modules', '.bin', 'neu.cmd') + '" build --release', {
    cwd: ROOT,
    stdio: 'inherit',
  });

  // Step 3: Verify and copy to release
  const buildDir = path.join(DIST, BINARY_NAME);
  // neu build renames: neutralino-win_x64.exe → gantt-chart-win_x64.exe
  const binaryOutput = `${BINARY_NAME}-win_x64.exe`;
  const required = [binaryOutput, 'resources.neu'];
  for (const f of required) {
    if (!fs.existsSync(path.join(buildDir, f))) {
      throw new Error(`Missing ${f} in ${buildDir}. neu build may have failed.`);
    }
  }

  const releaseDir = path.join(RELEASE, BINARY_NAME);
  if (fs.existsSync(releaseDir)) fs.rmSync(releaseDir, { recursive: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  for (const f of required) {
    fs.copyFileSync(path.join(buildDir, f), path.join(releaseDir, f));
  }
  // Rename exe to friendly name
  fs.renameSync(
    path.join(releaseDir, binaryOutput),
    path.join(releaseDir, `${BINARY_NAME}.exe`),
  );

  const releaseFiles = [`${BINARY_NAME}.exe`, 'resources.neu'];
  let totalSize = 0;
  console.log(`\n=== Release: release/${BINARY_NAME}/ ===`);
  for (const f of releaseFiles) {
    const st = fs.statSync(path.join(releaseDir, f));
    totalSize += st.size;
    console.log(`  ${f}  (${(st.size / 1024).toFixed(1)} KB)`);
  }
  console.log(`\n  Total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('  vs Electron: ~66 MB');
  console.log(`  Reduction: ${((1 - totalSize / 66000000) * 100).toFixed(0)}%`);
  console.log('\n  To run: double-click gantt-chart.exe');
  console.log('  Requires: WebView2 Runtime (built into Windows 10+)');
}

function findFile(dir, name) {
  const entries = fs.readdirSync(dir, { recursive: true });
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isFile() && path.basename(entry) === name) {
      return full;
    }
  }
  return null;
}

main().catch((err) => {
  console.error('Bundle failed:', err.message);
  process.exit(1);
});
