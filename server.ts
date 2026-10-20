import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Determine if running under tsx (development runtime)
const isTsxDev = Boolean(
  process.env.npm_lifecycle_event === 'dev' ||
  process.argv.some(arg => arg.includes('tsx')) ||
  process.execPath.includes('tsx') ||
  process.env.NODE_ENV !== 'production'
);

const distBundle = path.join(process.cwd(), 'dist', 'server.cjs');
const isProduction = !isTsxDev && process.env.NODE_ENV === 'production';

if (isProduction && fs.existsSync(distBundle)) {
  // In production with prebuilt bundle (npm run build -> npm start)
  await import(pathToFileURL(distBundle).href);
} else {
  // In development (tsx server.ts) or when tsx is executing:
  await import('./server/app.ts');
}

