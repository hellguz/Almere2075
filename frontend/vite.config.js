import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Configure HMR for Docker and reverse proxy
      hmr: {
        // Use the VITE_HMR_CLIENT_PORT from the environment if available
        clientPort: env.VITE_HMR_CLIENT_PORT || 2075,
      },
      // Listen on all network interfaces within the container
      host: '0.0.0.0',
      // Use polling for file system events, which is more reliable in Docker
      watch: {
        usePolling: true,
      },
      // MODIFIED: Add custom domain to allowed hosts to prevent Vite from blocking requests
      allowedHosts: [
        'almere.i-am-hellguz.uk',
      ],
    }
  }
})