import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('public/asset', { recursive: true, force: true });
mkdirSync('public/asset', { recursive: true });
cpSync('asset', 'public/asset', { recursive: true });
