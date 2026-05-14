import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, 'src/server/index.ts');

// Use tsx to run TypeScript directly
process.argv = ['node', serverPath];
await import('tsx/esm');
