/**
 * Neutralino 初始化管理
 * 用于管理 Neutralino 环境的初始化状态
 */

let isNeutralinoInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * 检查是否在 Neutralino 环境中运行
 */
export function isInNeutralino(): boolean {
  return typeof Neutralino !== 'undefined';
}

/**
 * 获取 Neutralino 初始化状态
 */
export function isInitialized(): boolean {
  return isNeutralinoInitialized;
}

/**
 * 初始化 Neutralino
 */
export async function initializeNeutralino(): Promise<void> {
  if (!isInNeutralino()) {
    console.log('Not running in Neutralino environment');
    return;
  }

  if (isNeutralinoInitialized) {
    console.log('Neutralino already initialized');
    return;
  }

  // 如果已经在初始化中，等待它完成
  if (initializationPromise) {
    console.log('Waiting for Neutralino initialization...');
    return initializationPromise;
  }

  console.log('Initializing Neutralino...');

  initializationPromise = (async () => {
    try {
      await Neutralino.init();
      isNeutralinoInitialized = true;
      console.log('Neutralino initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Neutralino:', error);
      isNeutralinoInitialized = false;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * 检查 Neutralino 是否可用并初始化
 * @returns boolean - Neutralino 是否可用
 */
export async function ensureNeutralinoReady(): Promise<boolean> {
  if (!isInNeutralino()) {
    console.error('Application is not running in Neutralino environment');
    return false;
  }

  if (!isNeutralinoInitialized) {
    try {
      await initializeNeutralino();
    } catch (error) {
      console.error('Failed to ensure Neutralino is ready:', error);
      return false;
    }
  }

  return true;
}

/**
 * 重置初始化状态（用于测试）
 */
export function resetInitializationState(): void {
  isNeutralinoInitialized = false;
  initializationPromise = null;
}
