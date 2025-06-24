import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: './public', // Set public as root directory
  build: {
    outDir: '../server/public', // Output to server's public folder
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, './public/index.html')
    }
  },
  server: {
    port: 3001
  }
})