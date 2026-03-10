import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/* global Office */
declare const Office: any;

// Initialize Office.js then render React
Office.onReady(() => {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
