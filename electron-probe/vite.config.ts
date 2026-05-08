import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import electronRenderer from 'vite-plugin-electron-renderer'

const projectRoot = process.cwd()

export default defineConfig(async () => ({
  root: 'renderer',
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: '../renderer-dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    await electron({
      main: {
        entry: path.join(projectRoot, 'main.js'),
        vite: {
          build: {
            outDir: path.join(projectRoot, 'dist-electron'),
          },
        },
      },
      preload: {
        input: path.join(projectRoot, 'preload.js'),
        vite: {
          build: {
            outDir: path.join(projectRoot, 'dist-electron'),
          },
        },
      },
    }),
    electronRenderer(),
  ],
}))
