import path from 'node:path'
import { defineConfig } from 'vite'
import packageJson from '../package.json'

export default defineConfig(({ mode }) => ({
  root: __dirname,
  base: mode === 'production' ? '/dirty-dom/' : '/',
  build: {
    outDir: path.resolve(__dirname, '../.gh-pages'),
    rollupOptions: {
      treeshake: 'smallest',
    },
    target: 'esnext',
  },
  define: {
    'import.meta.env.VERSION': JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      'dirty-dom': path.resolve(__dirname, '../'),
    },
  },
}))
