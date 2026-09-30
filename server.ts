import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const distBundle = path.join(process.cwd(), 'dist', 'server.cjs');

// In production or when dist/server.cjs exists and we're not running dev:
if (fs.existsSync(distBundle) && process.env.npm_lifecycle_event !== 'dev') {
  await import(pathToFileURL(distBundle).href);
} else {
  // In development (tsx server.ts):
  await import('./server/app.ts');
}
