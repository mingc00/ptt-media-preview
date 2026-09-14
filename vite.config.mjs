import { defineConfig } from 'vite';

const entries = {
  term: 'src/term.js',
  'term-native': 'src/term-native.js',
  web: 'src/web.js',
};

export default defineConfig(({ mode }) => {
  const entry = entries[mode];
  if (!entry) {
    throw new Error(`Unknown content script target: ${mode}`);
  }

  return {
    build: {
      copyPublicDir: false,
      emptyOutDir: mode === 'web',
      lib: {
        entry,
        fileName: () => `${mode}.js`,
        formats: ['iife'],
        name: `PttMediaPreview${mode.replaceAll('-', '_')}`,
      },
      minify: false,
      outDir: 'dist',
    },
  };
});
