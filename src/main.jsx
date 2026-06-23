import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

function showStartupError(error) {
  const root = document.getElementById('root');
  if (!root) return;

  root.innerHTML = `
    <div style="max-width: 760px; margin: 48px auto; padding: 24px; border-radius: 18px; background: #fff1f2; color: #881337; font-family: sans-serif;">
      <h1 style="margin-top: 0;">应用启动失败</h1>
      <p>请把下面这段错误信息发给开发者：</p>
      <pre style="white-space: pre-wrap; overflow: auto; padding: 16px; border-radius: 12px; background: #fff; color: #172033;">${String(error?.stack || error?.message || error)}</pre>
    </div>
  `;
}

window.addEventListener('error', (event) => showStartupError(event.error || event.message));
window.addEventListener('unhandledrejection', (event) => showStartupError(event.reason));

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('页面中没有找到 #root 节点');
  }

  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  showStartupError(error);
}
