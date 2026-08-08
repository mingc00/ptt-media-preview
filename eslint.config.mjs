import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  {
    ignores: ['dist/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.browser },
    plugins: { js },
    extends: ['js/recommended'],
  },
  {
    files: ['surge/*.js'],
    languageOptions: {
      globals: {
        $response: 'readonly',
        $done: 'readonly',
      },
    },
  },
]);
