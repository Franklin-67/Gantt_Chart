import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { saveProject } from './services/storageService';
import './index.css';

async function bootstrap(): Promise<void> {
  // Initialize Neutralino native API (no-op in browser)
  if (typeof Neutralino !== 'undefined') {
    await Neutralino.init();

    // Save on window close
    Neutralino.events.on('windowClose', () => {
      saveProject();
    });
  }

  const root = createRoot(document.getElementById('root')!);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
}

bootstrap();
