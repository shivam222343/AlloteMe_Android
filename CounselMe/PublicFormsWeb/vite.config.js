import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174
    },
    css: {
        postcss: {
            plugins: [], // This stops it from looking at parent folders
        }
    }
})
