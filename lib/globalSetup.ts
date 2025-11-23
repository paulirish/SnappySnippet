import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  execSync('node esbuild.mjs');
}

export default globalSetup;
