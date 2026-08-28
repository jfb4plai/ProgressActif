import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Les fichiers de test des pages (*.jsx.test.js) contiennent du JSX bien
  // qu'ayant l'extension .js : on étend le filtre de plugin-react à tous les .js.
  plugins: [react({ include: /\.(js|jsx)$/ })],
  esbuild: { loader: 'jsx', include: /src\/.*\.jsx?$/, exclude: [] },
  test: {
    environment: 'node',
    passWithNoTests: true,
    environmentMatchGlobs: [['**/*.jsx.test.js', 'jsdom'], ['src/pages/**', 'jsdom']],
    setupFiles: [],
  },
})
