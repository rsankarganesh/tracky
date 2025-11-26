import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This tells the app it is hosted at https://rsankarganesh.github.io/tracky/
  base: "/tracky/", 
})
