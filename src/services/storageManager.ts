/**
 * 多层存储管理器
 *
 * 读写优先级（桌面端）：
 *   Neutralino.storage API（持久化 JSON 文件，最可靠）→
 *   文件系统备份 → localStorage（浏览器开发模式）
 *
 * 写入时三层同时写，读取时逐层回退，命中后同步到更高层。
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let dataDirReady = false;
let _envLogged = false;

// ── 环境检测 ──

function isNeutralinoEnv(): boolean {
  return typeof Neutralino !== 'undefined';
}

function hasStorage(): boolean {
  return isNeutralinoEnv() &&
    typeof Neutralino.storage !== 'undefined' &&
    typeof Neutralino.storage.getData === 'function' &&
    typeof Neutralino.storage.setData === 'function';
}

function hasFilesystem(): boolean {
  return isNeutralinoEnv() &&
    typeof Neutralino.filesystem !== 'undefined' &&
    typeof Neutralino.filesystem.readBinaryFile === 'function' &&
    typeof Neutralino.filesystem.writeBinaryFile === 'function';
}

function hasOS(): boolean {
  return isNeutralinoEnv() &&
    typeof Neutralino.os !== 'undefined' &&
    typeof Neutralino.os.showOpenDialog === 'function';
}

function logEnvOnce(): void {
  if (_envLogged) return;
  _envLogged = true;
  console.log('[storage] Environment:',
    'neutralino:', isNeutralinoEnv(),
    'storage:', hasStorage(),
    'filesystem:', hasFilesystem(),
    'os:', hasOS(),
    'NL_PATH:', typeof NL_PATH === 'string' ? NL_PATH : 'undefined',
  );
}

// ── 路径 ──

function getDataDir(): string {
  if (typeof NL_PATH === 'string' && NL_PATH.length > 0) {
    // 使用 Neutralino 管理的 .storage 目录，和 storage API 共用同一位置
    return NL_PATH + '/.storage';
  }
  return '';
}

function getDataFilePath(key: string): string {
  return getDataDir() + '/' + key + '.json';
}

// ── Neutralino.storage（主存储）──

async function readFromStorage(key: string): Promise<string | null> {
  if (!hasStorage()) return null;
  try {
    const val = await Neutralino.storage.getData(key);
    console.log('[storage] Neutralino.storage.getData("' + key + '"):', val ? 'found (' + val.length + ' chars)' : 'not found');
    return val || null;
  } catch (e) {
    console.error('[storage] Neutralino.storage.getData failed:', e);
    return null;
  }
}

async function writeToStorage(key: string, value: string): Promise<boolean> {
  if (!hasStorage()) return false;
  try {
    await Neutralino.storage.setData(key, value);
    console.log('[storage] Neutralino.storage.setData("' + key + '") OK, len=' + value.length);
    return true;
  } catch (e) {
    console.error('[storage] Neutralino.storage.setData failed:', e);
    return false;
  }
}

// ── 文件系统（备份存储）──

export async function ensureDataDir(): Promise<void> {
  if (dataDirReady) return;
  if (!hasFilesystem()) {
    dataDirReady = true;
    return;
  }
  const dir = getDataDir();
  if (!dir) return;
  try {
    try {
      await Neutralino.filesystem.createDirectory(dir);
      console.log('[storage] Created directory:', dir);
    } catch {
      // already exists
    }
    dataDirReady = true;
    console.log('[storage] Data directory ready:', dir);
  } catch (e) {
    console.error('[storage] ensureDataDir failed:', e);
  }
}

async function readFromFile(key: string): Promise<string | null> {
  if (!hasFilesystem()) return null;
  try {
    const path = getDataFilePath(key);
    const buf = await Neutralino.filesystem.readBinaryFile(path);
    const text = decoder.decode(buf);
    console.log('[storage] File read "' + path + '":', text ? 'found (' + text.length + ' chars)' : 'empty');
    return text || null;
  } catch {
    // file not found or can't read — normal for first run
    return null;
  }
}

async function writeToFile(key: string, value: string): Promise<boolean> {
  if (!hasFilesystem()) return false;
  try {
    await ensureDataDir();
    const path = getDataFilePath(key);
    const buf = encoder.encode(value);
    await Neutralino.filesystem.writeBinaryFile(path, buf.buffer as ArrayBuffer);
    console.log('[storage] File written "' + path + '", len=' + value.length);
    return true;
  } catch (e) {
    console.error('[storage] File write failed:', e);
    return false;
  }
}

// ── localStorage（浏览器后备）──

function readFromLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToLocal(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// 公开 API
// ══════════════════════════════════════════════════════════════

/**
 * 读取数据
 * 桌面端：Neutralino.storage → 文件 → localStorage
 * 浏览器：localStorage
 */
export async function getData(key: string): Promise<string | null> {
  logEnvOnce();

  if (isNeutralinoEnv()) {
    // 1. Neutralino.storage（主存储，专为持久化设计）
    let value = await readFromStorage(key);
    if (value !== null) {
      // 同步到文件备份
      writeToFile(key, value);
      writeToLocal(key, value);
      return value;
    }

    // 2. 文件备份
    value = await readFromFile(key);
    if (value !== null) {
      console.log('[storage] Found data in file backup for key:', key);
      // 恢复主存储
      writeToStorage(key, value);
      writeToLocal(key, value);
      return value;
    }
  }

  // 3. localStorage
  const localVal = readFromLocal(key);
  if (localVal !== null) {
    console.log('[storage] Found data in localStorage for key:', key);
    if (isNeutralinoEnv()) {
      // 同步到主存储和文件
      writeToStorage(key, localVal);
      writeToFile(key, localVal);
    }
    return localVal;
  }

  console.log('[storage] No data found for key:', key);
  return null;
}

/**
 * 保存数据
 * 桌面端：Neutralino.storage（主） + 文件（备份） + localStorage（备用）
 * 浏览器：localStorage
 */
export async function setData(key: string, value: string): Promise<void> {
  logEnvOnce();
  let primarySaved = true; // Assume OK for browser mode

  if (isNeutralinoEnv()) {
    // 主存储：Neutralino.storage
    const storageOk = await writeToStorage(key, value);
    // 备份：文件
    const fileOk = await writeToFile(key, value);

    if (!storageOk && !fileOk) {
      throw new Error('Failed to save data: both Neutralino.storage and filesystem failed');
    }
    primarySaved = storageOk || fileOk;
  }

  // 浏览器后备
  writeToLocal(key, value);

  if (!primarySaved) {
    throw new Error('Failed to save data to primary storage');
  }

  console.log('[storage] Data saved for key:', key);
}

// ── 兼容导出 ──

export function isNeutralinoStorageAvailable(): boolean { return hasStorage(); }
export function isNeutralinoFileSystemAvailable(): boolean { return hasFilesystem(); }
export function isNeutralinoOSAvailable(): boolean { return hasOS(); }

export async function readBinaryFile(path: string): Promise<ArrayBuffer> {
  if (hasFilesystem()) {
    return await Neutralino.filesystem.readBinaryFile(path);
  }
  throw new Error('File system API not available in browser mode');
}

export async function writeBinaryFile(path: string, data: ArrayBuffer): Promise<void> {
  if (hasFilesystem()) {
    await Neutralino.filesystem.writeBinaryFile(path, data);
  } else {
    throw new Error('File system API not available in browser mode. Please run in Neutralino environment.');
  }
}

export async function showOpenDialog(title: string, options: any): Promise<string[] | null> {
  if (hasOS()) {
    return await Neutralino.os.showOpenDialog(title, options);
  }
  return await showBrowserFileDialog(options);
}

export async function showSaveDialog(title: string, options: any): Promise<string | null> {
  if (hasOS()) {
    return await Neutralino.os.showSaveDialog(title, options);
  }
  return prompt('请输入保存文件路径 (浏览器模式下将使用下载):', options.defaultPath || 'export.xlsx');
}

function showBrowserFileDialog(options: any): Promise<string[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options.filters?.length > 0) {
      input.accept = options.filters[0].extensions.map((ext: string) => `.${ext}`).join(',');
    }
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as ArrayBuffer;
          const tempKey = `__temp_file_${Date.now()}__`;
          sessionStorage.setItem(tempKey, JSON.stringify({
            name: file.name,
            data: Array.from(new Uint8Array(result))
          }));
          resolve([tempKey]);
        };
        reader.onerror = () => resolve(null);
        reader.readAsArrayBuffer(file);
      } else {
        resolve(null);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function downloadFile(filename: string, data: ArrayBuffer): Promise<void> {
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getBrowserTempFile(path: string): Promise<ArrayBuffer | null> {
  try {
    const tempData = sessionStorage.getItem(path);
    if (tempData) {
      const parsed = JSON.parse(tempData);
      return new Uint8Array(parsed.data).buffer;
    }
  } catch (error) {
    console.error('Error reading temp file:', error);
  }
  return null;
}

export function isInNeutralino(): boolean { return isNeutralinoEnv(); }
export function isFullyFunctional(): boolean { return hasStorage() && hasFilesystem() && hasOS(); }

export function getEnvironmentInfo(): string {
  const origin = typeof location !== 'undefined' ? location.protocol + '//' + location.host : 'unknown';
  return JSON.stringify({
    origin,
    neutralinoAvailable: isNeutralinoEnv(),
    storageAvailable: hasStorage(),
    fileSystemAvailable: hasFilesystem(),
    osAvailable: hasOS(),
    fullyFunctional: isFullyFunctional(),
    dataDir: getDataDir() || '(browser mode)',
    NL_PATH: typeof NL_PATH === 'string' ? NL_PATH : 'undefined',
    localStorageAvailable: typeof localStorage !== 'undefined',
  }, null, 2);
}

// 旧接口兼容（no-op）
export async function initializeNeutralino(): Promise<void> {}
export async function ensureNeutralinoInitialized(): Promise<void> {}
