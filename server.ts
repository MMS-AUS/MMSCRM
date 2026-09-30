import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const isDev = process.env.npm_lifecycle_event === 'dev';
const distBundle = path.join(process.cwd(), 'dist', 'server.cjs');

if (!isDev) {
  // Production runtime (Cloud Run / npm start)
  if (!fs.existsSync(distBundle)) {
    try {
      const { buildSync } = await import('esbuild');
      buildSync({
        entryPoints: ['server/app.ts'],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        packages: 'external',
        outfile: 'dist/server.cjs'
      });
    } catch (buildErr) {
      console.warn('[Server Launcher] On-demand esbuild fallback notice:', buildErr);
    }
  }

  if (fs.existsSync(distBundle)) {
    await import(pathToFileURL(distBundle).href);
  } else {
    await import('./server/app.ts');
  }
} else {
  // In development (tsx server.ts / npm run dev):
  await import('./server/app.ts');
}
