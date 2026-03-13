import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    hmr: true,
  },
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — loads first, always cached
          'vendor-react': ['react', 'react-dom'],
          // Supabase — shared by auth, db, notifications
          'vendor-supabase': ['@supabase/supabase-js'],
          // Charts — only needed on dashboard
          'vendor-charts': ['recharts'],
          // PDF generation — only loaded when user clicks export
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          // Excel/spreadsheet parsing — only on bank import
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
});
