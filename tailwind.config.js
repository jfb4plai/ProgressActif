import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    join(__dirname, 'index.html'),
    join(__dirname, 'src/**/*.{js,jsx}'),
  ],
  theme: {
    extend: {
      colors: {
        teal: '#0f6e56',
        'plai-orange': '#f97316',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
    }
  },
  plugins: []
}
