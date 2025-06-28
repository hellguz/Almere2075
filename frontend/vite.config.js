import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Allow requests from your specific host.
    allowedHosts: ['almere.i-am-hellguz.uk'],

    // Ensure the server is accessible externally (replaces --host flag).
    host: true,

    // Use polling for file watching to ensure hot-reloading works in Docker.
    watch: {
      usePolling: true,
    },
  },
});