import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Root .env holds branding + the Together.ai key. Only the branding fields
// are lifted into the browser bundle; the Together key must NEVER cross.
const ROOT_ENV_DIR = resolve(__dirname, '../..');
const ALLOWED_TO_BUNDLE = ['WHITELABEL', 'WL_PRODUCT', 'PRODUCT_VERSION'] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ROOT_ENV_DIR, ''); // empty prefix = load everything
  const define: Record<string, string> = {};
  for (const key of ALLOWED_TO_BUNDLE) {
    const val = env[key];
    if (val !== undefined) define[`import.meta.env.VITE_${key}`] = JSON.stringify(val);
  }

  return {
    plugins: [react()],
    server: { port: 5173 },
    define,
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.ts'],
      include: ['test/**/*.test.{ts,tsx}'],
    },
  };
});
