import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'

if (typeof window !== "undefined" && window.location.pathname.endsWith("/index.html")) {
  const nextUrl = `/${window.location.search}${window.location.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}

const rootElement = document.getElementById('root');

const showBootError = (error) => {
  if (!rootElement) return;
  rootElement.innerHTML = `
    <div style="min-height:100vh;background:#020617;color:#e2e8f0;padding:24px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
      <div style="max-width:960px;margin:0 auto;">
        <p style="color:#fda4af;text-transform:uppercase;letter-spacing:.3em;font-size:12px;">Boot Error</p>
        <h1 style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:28px;line-height:1.2;margin:12px 0 16px;">A aplicação falhou antes de montar o React.</h1>
        <div style="border:1px solid rgba(244,63,94,.35);background:rgba(244,63,94,.1);border-radius:16px;padding:16px;margin-bottom:16px;white-space:pre-wrap;word-break:break-word;">${String(error?.message || error)}</div>
        <pre style="border:1px solid #1e293b;background:#0f172a;border-radius:16px;padding:16px;overflow:auto;white-space:pre-wrap;">${String(error?.stack || '')}</pre>
      </div>
    </div>
  `;
};

window.addEventListener("error", (event) => {
  showBootError(event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  showBootError(event.reason);
});

import('@/App.jsx')
  .then(({ default: App }) => {
    ReactDOM.createRoot(rootElement).render(
      <App />
    );
  })
  .catch((error) => {
    console.error("Failed to bootstrap app:", error);
    showBootError(error);
  });
