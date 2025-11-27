import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'

    // https://vitejs.dev/config/
    export default defineConfig({
      plugins: [react()],
      // This ensures assets are looked for in /tracky/assets/ not /assets/
      base: "/tracky/", 
    })
