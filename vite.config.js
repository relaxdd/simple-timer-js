import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/class/SimpleTimer.ts',
      name: 'SimpleTimer',
      fileName: (format) => `simple-timer.${format}.js`,
    },
  },
});