import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return <div style={{ padding: 24 }}>Catre Admin — foundation booting…</div>;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
