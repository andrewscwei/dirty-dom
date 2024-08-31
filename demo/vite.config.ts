import path from 'node:path'
import { defineConfig } from 'vite'
import packageJson from '../package.json'

export default defineConfig({
  root: __dirname,
  base: '/dirty-dom/',
  build: {
    outDir: path.resolve(__dirname, '../.gh-pages'),
    target: 'esnext',
  },
  define: {
    __VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      'dirty-dom': path.resolve(__dirname, '../'),
    },
  },
})
