import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const certDir = path.join(process.env.HOME || '', '.office-addin-dev-certs');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8003,
    https: {
      key: fs.readFileSync(path.join(certDir, 'localhost.key')),
      cert: fs.readFileSync(path.join(certDir, 'localhost.crt')),
    },
  },
  build: {
    outDir: 'dist',
  },
});
