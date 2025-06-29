import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // hmr (hot module replacement) configuration for running inside docker
    // and behind a reverse proxy
    hmr: {
      clientPort: 2075 // The port Nginx is exposed on
    },
    // Allow requests from the Nginx proxy's host
    host: '0.0.0.0',
    allowedHosts: [
      'almere.i-am-hellguz.uk'
    ],
  }
})

