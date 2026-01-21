import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/lsr/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_COMMIT_SHA || 'dev'),
  },
})
