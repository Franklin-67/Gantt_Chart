import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { saveProject } from './services/storageService';
import { initializeNeutralino, isInNeutralino } from './services/neutralinoManager';
import { ensureDataDir } from './services/storageManager';
import './index.css';

async function bootstrap(): Promise<void> {
  // 首先初始化 Neutralino
  if (isInNeutralino()) {
    await initializeNeutralino();

    // 确保数据目录存在（用于文件持久化）
    await ensureDataDir();

    // Save on window close
    Neutralino.events.on('windowClose', () => {
      saveProject();
    });
  } else {
    console.log('Running in non-Neutralino environment (development mode)');
  }

  const root = createRoot(document.getElementById('root')!);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}

bootstrap();
