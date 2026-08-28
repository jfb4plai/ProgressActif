import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    passWithNoTests: true,
    environmentMatchGlobs: [['**/*.jsx.test.js', 'jsdom'], ['src/pages/**', 'jsdom']],
    setupFiles: [],
  },
})
