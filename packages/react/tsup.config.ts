import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react'],
  banner: {
    js: "'use client';"
  },
  esbuildOptions(options) {
    options.banner = {
      js: "'use client';"
    }
  }
});