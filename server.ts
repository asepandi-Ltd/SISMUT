import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/apiApp';
import { getSupabaseConfig, loadSupabaseDatabase } from './server/supabaseCloudStore';

const PORT = 3000;

async function startServer() {
  const app = createApiApp();
  const server = http.createServer(app);

  // Pre-warm Supabase Cloud Database & provision buckets + 3 officer accounts on startup
  loadSupabaseDatabase()
    .then((db) => {
      console.log(
        `[Supabase Cloud Ready] Connected to ${getSupabaseConfig().url} (${db.profiles.length} accounts active)`
      );
    })
    .catch((err) => {
      console.error('[Supabase Cloud Init Error]:', err.message);
    });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SISMUT RSUD Al-Mulk (100% Supabase Cloud Storage) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
