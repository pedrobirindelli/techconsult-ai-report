import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: ['**/rules.json']
    },
    proxy: {
      '/estimate': 'http://127.0.0.1:5000',
      '/generate': 'http://127.0.0.1:5000',
      '/api': 'http://127.0.0.1:5000'
    }
  }
})
