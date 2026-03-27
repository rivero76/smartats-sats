/**
 * UPDATE LOG
 * 2026-03-27 00:00:00 | P19 S4-1: Added rollup-plugin-visualizer to generate dist/stats.html bundle treemap on build.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from 'lovable-tagger'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Don't bundle PDF.js worker - let it be loaded from CDN
        return id.includes('pdf.worker')
      },
    },
  },
}))
