// Script to copy PDF.js worker to public folder
// Run this after npm install: node scripts/copy-pdf-worker.js

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerSource = join(
  __dirname,
  '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
);

const workerDest = join(
  __dirname,
  '../public/pdf.worker.min.mjs'
);

try {
  // Check if source exists
  if (!existsSync(workerSource)) {
    console.error('❌ PDF.js worker not found at:', workerSource);
    console.log('💡 Try running: npm install pdfjs-dist');
    process.exit(1);
  }

  // Copy the file
  copyFileSync(workerSource, workerDest);
  console.log('✅ PDF.js worker copied to public folder');
  console.log('📁 Source:', workerSource);
  console.log('📁 Destination:', workerDest);
} catch (error) {
  console.error('❌ Failed to copy PDF.js worker:', error.message);
  process.exit(1);
}
