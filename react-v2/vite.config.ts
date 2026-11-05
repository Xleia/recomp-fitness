import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the repository at /recomp-fitness/.
  base: '/recomp-fitness/react-v2/',
  plugins: [react()],
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
